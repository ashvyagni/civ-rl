import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Brain, TrendingUp, History, FlaskConical } from 'lucide-react';
import type { Civilization, ActionDetail } from '../types';
import { ACTION_COLORS, STAT_COLORS } from '../types';
import { DecisionTree } from './DecisionTree';
import { TechTreePanel } from './TechTreePanel';

const ACTIONS = ['explore', 'gather', 'attack', 'fortify', 'expand'];

interface DecisionSnapshot {
  stepNumber: number;
  stats: Record<string, number>;
  actionDetails: Record<string, ActionDetail>;
  actionProbs: Record<string, number>;
  chosenAction: string;
  decisionTrace: string;
}

const MAX_HISTORY = 20;

function ActionProbBar({ action, pct, maxPct }: { action: string; pct: number; maxPct: number }) {
  const color = ACTION_COLORS[action] ?? '#666';
  const isMax = pct >= maxPct && pct > 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-muted-foreground w-14 shrink-0">{action}</span>
      <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: isMax ? 1 : 0.5 }}
        />
      </div>
      <span className="text-[10px] font-mono w-9 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function snapshotKey(snap: DecisionSnapshot): string {
  return `${snap.stepNumber}-${snap.chosenAction}-${JSON.stringify(snap.actionProbs)}`;
}

interface AiBrainPanelProps {
  civ: Civilization | null;
  currentStep: number;
}

export function AiBrainPanel({ civ, currentStep }: AiBrainPanelProps) {
  const [showTech, setShowTech] = useState(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<Map<number, DecisionSnapshot[]>>(new Map());
  const [currentSnapshot, setCurrentSnapshot] = useState<DecisionSnapshot | null>(null);
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (!civ) return;
    const snapshot: DecisionSnapshot = {
      stepNumber: currentStep,
      stats: { ...civ.stats },
      actionDetails: civ.action_details ?? {},
      actionProbs: { ...civ.action_probs },
      chosenAction: civ.last_action,
      decisionTrace: civ.last_decision_trace,
    };
    const key = snapshotKey(snapshot);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    const history = historyRef.current;
    const snapshots = [...(history.get(civ.id) ?? [])];
    snapshots.push(snapshot);
    if (snapshots.length > MAX_HISTORY) {
      snapshots.shift();
    }
    history.set(civ.id, snapshots);

    if (historyIndex === -1) {
      setCurrentSnapshot(null);
    }
  }, [civ, currentStep, historyIndex]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    setHistoryIndex(idx);
    if (!civ) return;
    const snapshots = historyRef.current.get(civ.id) ?? [];
    if (idx >= 0 && idx < snapshots.length) {
      setCurrentSnapshot(snapshots[idx]);
    } else {
      setCurrentSnapshot(null);
    }
  }, [civ]);

  const handleResetScrub = useCallback(() => {
    setHistoryIndex(-1);
    setCurrentSnapshot(null);
  }, []);

  if (!civ) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <Brain className="w-10 h-10 opacity-30" />
        <p className="text-sm font-mono text-center">CLICK A CIVILIZATION CARD<br />TO INSPECT ITS AI BRAIN</p>
      </div>
    );
  }

  const snapshots = historyRef.current.get(civ.id) ?? [];
  const scrubIdx = historyIndex >= 0 && historyIndex < snapshots.length ? historyIndex : -1;
  const displaySnapshot = scrubIdx >= 0 ? snapshots[scrubIdx] : null;

  const chartData = civ.stat_history.slice(-30).map((snap, i) => ({
    t: i,
    aggression: Math.round(snap.aggression),
    defense: Math.round(snap.defense),
    economy: Math.round(snap.economy),
    exploration: Math.round(snap.exploration),
  }));

  const maxProb = Math.max(...Object.values(civ.action_probs ?? {}), 1);

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: civ.color, boxShadow: `0 0 8px ${civ.color}` }} />
        <span className="font-bold text-sm uppercase tracking-wider">{civ.name}</span>
        <span className="text-[9px] font-mono text-muted-foreground ml-1">STEP {currentStep}</span>
        {!civ.alive && (
          <span className="text-[10px] font-mono text-destructive border border-destructive/40 px-1.5 py-0.5 rounded ml-auto">ELIMINATED</span>
        )}
        <button
          onClick={() => setShowTech(!showTech)}
          className="ml-auto text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <FlaskConical className="w-3 h-3" />
          {showTech ? 'HIDE TECH' : 'TECH'}
        </button>
      </div>

      {/* Decision Tree Visualization */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/10 border-b border-border/50">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Neural Decision Tree</span>
          {displaySnapshot && (
            <span className="text-[9px] font-mono text-yellow-400 ml-auto">HISTORY #{scrubIdx + 1}</span>
          )}
        </div>
        <div className="p-2">
          <DecisionTree civ={civ} decisionSnapshot={displaySnapshot} />
        </div>
      </div>

      {/* History Scrubber */}
      {snapshots.length > 1 && (
        <div className="flex items-center gap-3 px-3 py-2 border border-border/50 rounded-lg bg-muted/5">
          <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={-1}
            max={snapshots.length - 1}
            value={scrubIdx}
            onChange={handleScrub}
            className="flex-1 h-1 accent-primary"
            style={{ accentColor: 'hsl(var(--primary))' }}
          />
          <span className="text-[9px] font-mono text-muted-foreground w-16 text-right">
            {scrubIdx >= 0 ? `#${scrubIdx + 1}/${snapshots.length}` : 'LIVE'}
          </span>
          {scrubIdx >= 0 && (
            <button
              onClick={handleResetScrub}
              className="text-[9px] font-mono text-primary hover:text-primary/80 transition-colors"
            >
              LIVE
            </button>
          )}
        </div>
      )}

      {/* Decision probabilities */}
      {!displaySnapshot && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Action Probabilities</span>
          </div>
          <div className="space-y-1.5">
            {ACTIONS.map(action => (
              <ActionProbBar
                key={action}
                action={action}
                pct={civ.action_probs[action] ?? 0}
                maxPct={maxProb}
              />
            ))}
          </div>
          {civ.last_decision_trace && (
            <div className="bg-muted/20 border border-border/60 rounded p-2 font-mono text-[10px] text-primary/80 leading-relaxed">
              <span className="text-muted-foreground mr-1">▶</span>
              {civ.last_decision_trace}
            </div>
          )}
        </div>
      )}

      {/* Historical decision snapshot info */}
      {displaySnapshot && (
        <div className="space-y-1.5">
          <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
            Snapshot at Step {displaySnapshot.stepNumber > 0 ? `#${displaySnapshot.stepNumber}` : 'replay'}
          </span>
          <div className="bg-muted/20 border border-border/60 rounded p-2 font-mono text-[10px] text-yellow-400/80 leading-relaxed">
            <span className="text-muted-foreground mr-1">▶</span>
            {displaySnapshot.decisionTrace}
          </div>
          <div className="space-y-1">
            {ACTIONS.map(action => (
              <ActionProbBar
                key={action}
                action={action}
                pct={displaySnapshot.actionProbs[action] ?? 0}
                maxPct={Math.max(...Object.values(displaySnapshot.actionProbs), 1)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tech Tree (collapsible) */}
      {showTech && (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/10 border-b border-border/50">
            <FlaskConical className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Technology Tree</span>
          </div>
          <div className="p-2">
            <TechTreePanel civ={civ} />
          </div>
        </div>
      )}

      {/* Reward log */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Reward History</span>
        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
          {civ.reward_log.length === 0 && (
            <div className="text-[10px] font-mono text-muted-foreground opacity-50 text-center py-2">NO EVENTS YET</div>
          )}
          {[...civ.reward_log].reverse().map((entry, i) => (
            <div
              key={i}
              className="text-[10px] font-mono px-2 py-1 rounded leading-relaxed"
              style={{
                color: entry.type === 'reward' ? '#22c55e' : '#ef4444',
                backgroundColor: entry.type === 'reward' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                borderLeft: `2px solid ${entry.type === 'reward' ? '#22c55e' : '#ef4444'}`,
              }}
            >
              {entry.type === 'reward' ? '▲' : '▼'} {entry.msg}
            </div>
          ))}
        </div>
      </div>

      {/* Stat trajectory */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Stat Trajectory</span>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}
                labelFormatter={() => ''}
              />
              <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
              {(['aggression', 'defense', 'economy', 'exploration'] as const).map(stat => (
                <Line
                  key={stat}
                  type="monotone"
                  dataKey={stat}
                  stroke={STAT_COLORS[stat]}
                  dot={false}
                  strokeWidth={1.5}
                  name={stat.substring(0, 3).toUpperCase()}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-20 flex items-center justify-center text-[10px] font-mono text-muted-foreground opacity-50">
            COLLECTING DATA...
          </div>
        )}
      </div>
    </div>
  );
}
