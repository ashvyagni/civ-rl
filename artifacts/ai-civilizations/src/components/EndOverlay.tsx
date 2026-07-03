import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, RefreshCw, Eye } from 'lucide-react';
import { Button } from './ui';
import type { SimState } from '../types';

interface EndOverlayProps {
  simState: SimState;
  onPlayAgain: () => void;
  onWatchReplay: () => void;
}

export function EndOverlay({ simState, onPlayAgain, onWatchReplay }: EndOverlayProps) {
  const winner = simState.civs.find(c => c.id === simState.winner_id);
  const aliveCivs = simState.civs.filter(c => c.alive);

  // Build radar data for multi-civ comparison
  const radarData = [
    { stat: 'AGG' },
    { stat: 'DEF' },
    { stat: 'ECO' },
    { stat: 'EXP' },
  ].map(({ stat }) => {
    const entry: Record<string, string | number> = { stat };
    aliveCivs.forEach(c => {
      const key = stat === 'AGG' ? 'aggression' : stat === 'DEF' ? 'defense' : stat === 'ECO' ? 'economy' : 'exploration';
      entry[c.name] = c.stats[key as keyof typeof c.stats];
    });
    return entry;
  });

  const winReason =
    winner && simState.civs.filter(c => c.alive).length <= 1
      ? 'LAST STANDING'
      : winner && (winner.territory_count / (simState.grid_size * simState.grid_size)) >= 0.5
      ? 'TERRITORIAL DOMINANT'
      : 'STEP LIMIT CHAMPION';

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-6 py-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-xs font-mono text-muted-foreground tracking-[0.3em] uppercase animate-pulse">
            SIMULATION COMPLETE
          </div>
          <h1 className="text-4xl font-bold tracking-widest text-primary uppercase drop-shadow-[0_0_20px_rgba(0,200,200,0.5)]">
            DOMINANCE ACHIEVED
          </h1>
        </div>

        {/* Winner callout */}
        {winner && (
          <div
            className="rounded-xl border-2 p-6 text-center relative overflow-hidden"
            style={{
              borderColor: winner.color,
              boxShadow: `0 0 40px ${winner.color}30`,
            }}
          >
            <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 50% 50%, ${winner.color}, transparent)` }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Trophy className="w-8 h-8" style={{ color: winner.color }} />
                <span className="text-3xl font-bold uppercase tracking-wider" style={{ color: winner.color }}>
                  {winner.name}
                </span>
              </div>
              <div
                className="inline-block text-xs font-mono px-4 py-1.5 rounded-full border uppercase tracking-widest"
                style={{ borderColor: winner.color, color: winner.color, backgroundColor: `${winner.color}15` }}
              >
                {winReason}
              </div>
              <div className="flex items-center justify-center gap-8 mt-4 text-sm font-mono">
                <div>
                  <div className="text-muted-foreground text-xs">TERRITORY</div>
                  <div className="text-xl font-bold text-primary">{winner.territory_count}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">RESOURCES</div>
                  <div className="text-xl font-bold" style={{ color: '#fbbf24' }}>{winner.resources}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">TOTAL STEPS</div>
                  <div className="text-xl font-bold text-foreground">{simState.step_number}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Multi-civ radar comparison */}
        {aliveCivs.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <div className="text-xs font-mono uppercase text-muted-foreground mb-3 tracking-wider">Final Stat Comparison</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'monospace' }} />
                {aliveCivs.map(c => (
                  <Radar
                    key={c.id}
                    name={c.name}
                    dataKey={c.name}
                    stroke={c.color}
                    fill={c.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Final leaderboard */}
        <div className="border border-border rounded-lg p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground mb-3 tracking-wider">Final Leaderboard</div>
          <div className="space-y-2">
            {[...simState.civs]
              .sort((a, b) => b.territory_count - a.territory_count)
              .map((civ, i) => (
                <div key={civ.id} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
                  <span className="font-mono text-sm flex-1">{civ.name}</span>
                  {!civ.alive && <span className="text-[10px] font-mono text-destructive">ELIMINATED</span>}
                  <span className="font-mono text-sm text-primary">{civ.territory_count} tiles</span>
                  <span className="font-mono text-sm" style={{ color: '#fbbf24' }}>{civ.resources} res</span>
                </div>
              ))}
          </div>
        </div>

        {/* Event timeline */}
        <div className="border border-border rounded-lg p-4">
          <div className="text-xs font-mono uppercase text-muted-foreground mb-3 tracking-wider">Event Timeline</div>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {[...simState.event_log].slice(-20).reverse().map((ev, i) => (
              <div key={i} className="text-[11px] font-mono text-foreground/70 hover:text-foreground transition-colors leading-relaxed">
                {ev}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={onWatchReplay} className="font-mono">
            <Eye className="w-4 h-4 mr-2" /> WATCH REPLAY
          </Button>
          <Button onClick={onPlayAgain} className="font-mono font-bold uppercase tracking-wider px-8">
            <RefreshCw className="w-4 h-4 mr-2" /> PLAY AGAIN
          </Button>
        </div>
      </div>
    </div>
  );
}
