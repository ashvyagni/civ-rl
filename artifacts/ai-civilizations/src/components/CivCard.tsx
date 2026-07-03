import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { RefreshCw, Brain } from 'lucide-react';
import { Badge, cn } from './ui';
import type { Civilization } from '../types';
import { STAT_COLORS, ACTION_COLORS, ACTION_ICONS } from '../types';

const STAT_KEYS = ['aggression', 'defense', 'economy', 'exploration'] as const;

function Sparkline({ history, stat, color }: { history: Civilization['stat_history']; stat: string; color: string }) {
  const vals = history.slice(-12).map(h => h[stat as keyof typeof h] as number);
  if (vals.length < 2) return <div className="w-16 h-4 opacity-30 bg-muted rounded" />;
  const W = 64, H = 20;
  const min = 0, max = 100;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / (max - min)) * H}`).join(' ');
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  );
}

interface CivCardProps {
  civ: Civilization;
  onNudge: (stat: string, delta: number) => void;
  onReset: () => void;
  onOpenBrain: () => void;
  isSelected?: boolean;
}

export function CivCard({ civ, onNudge, onReset, onOpenBrain, isSelected }: CivCardProps) {
  const radarData = [
    { subject: 'AGG', value: civ.stats.aggression },
    { subject: 'DEF', value: civ.stats.defense },
    { subject: 'ECO', value: civ.stats.economy },
    { subject: 'EXP', value: civ.stats.exploration },
  ];

  const actionColor = civ.last_action ? ACTION_COLORS[civ.last_action] : undefined;
  const actionIcon = civ.last_action ? ACTION_ICONS[civ.last_action] : '';

  return (
    <div
      className={cn(
        'rounded-md border p-3 relative overflow-hidden transition-all cursor-pointer',
        civ.alive ? 'border-border hover:border-primary/40' : 'border-destructive/30 opacity-60 grayscale',
        isSelected && 'border-primary ring-1 ring-primary/30',
      )}
      style={{ boxShadow: civ.alive ? `0 0 16px ${civ.color}14` : undefined }}
      onClick={onOpenBrain}
    >
      {civ.alive && (
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-10 blur-[35px] rounded-full pointer-events-none"
          style={{ backgroundColor: civ.color }}
        />
      )}

      {/* Title row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: civ.color, boxShadow: `0 0 8px ${civ.color}` }} />
          <span className="font-bold text-sm uppercase tracking-wider">{civ.name}</span>
          {!civ.alive && <Badge variant="destructive" className="text-[9px] px-1">ELIMINATED</Badge>}
          {civ.last_action && civ.alive && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${actionColor}22`, color: actionColor, border: `1px solid ${actionColor}44` }}
            >
              {actionIcon} {civ.last_action}
            </span>
          )}
        </div>
        <div className="flex gap-3 text-right shrink-0">
          <div>
            <div className="text-[9px] text-muted-foreground font-mono">TER</div>
            <div className="font-mono font-bold text-xs text-primary">{civ.territory_count}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground font-mono">RES</div>
            <div className="font-mono font-bold text-xs" style={{ color: '#fbbf24' }}>{civ.resources}</div>
          </div>
        </div>
      </div>

      {/* Radar + stats */}
      <div className="flex gap-3 items-center">
        <div className="w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace' }} />
              <Radar dataKey="value" stroke={civ.color} fill={civ.color} fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {STAT_KEYS.map(stat => (
            <div key={stat} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase w-7 shrink-0" style={{ color: STAT_COLORS[stat] }}>
                {stat.substring(0, 3)}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${civ.stats[stat]}%`, backgroundColor: STAT_COLORS[stat] }}
                />
              </div>
              <Sparkline history={civ.stat_history} stat={stat} color={STAT_COLORS[stat]} />
              <span className="text-[10px] font-mono w-5 text-right text-muted-foreground">{Math.round(civ.stats[stat])}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nudge controls */}
      {civ.alive && (
        <div className="mt-3 space-y-1">
          {STAT_KEYS.map(stat => (
            <div key={stat} className="flex items-center gap-1">
              <span className="text-[9px] font-mono uppercase text-muted-foreground w-7">{stat.substring(0, 3)}</span>
              <button
                onClick={e => { e.stopPropagation(); onNudge(stat, -10); }}
                className="flex-1 text-[10px] font-mono border border-border/40 rounded hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors py-0.5"
              >−10</button>
              <button
                onClick={e => { e.stopPropagation(); onNudge(stat, 10); }}
                className="flex-1 text-[10px] font-mono border border-border/40 rounded hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400 transition-colors py-0.5"
              >+10</button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
        <button
          onClick={e => { e.stopPropagation(); onOpenBrain(); }}
          className={cn(
            'flex items-center gap-1 text-[10px] font-mono transition-colors',
            isSelected ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          )}
        >
          <Brain className="w-3 h-3" /> AI BRAIN
        </button>
        <button
          onClick={e => { e.stopPropagation(); onReset(); }}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-destructive transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> RESET
        </button>
      </div>
    </div>
  );
}
