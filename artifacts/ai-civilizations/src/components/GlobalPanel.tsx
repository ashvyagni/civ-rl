import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { GlobalStats } from '../types';
import { STAT_COLORS } from '../types';

interface GlobalPanelProps {
  globalStats: GlobalStats | null;
}

export function GlobalPanel({ globalStats }: GlobalPanelProps) {
  if (!globalStats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm opacity-50">
        AWAITING DATA...
      </div>
    );
  }

  const { territory_leaderboard, resource_leaderboard, stat_trends, total_events } = globalStats;
  const maxTerritory = Math.max(...territory_leaderboard.map(e => e.territory), 1);
  const maxResources = Math.max(...resource_leaderboard.map(e => e.resources), 1);

  return (
    <div className="flex flex-col gap-5 p-3 overflow-y-auto h-full custom-scrollbar">
      {/* Total events counter */}
      <div className="flex items-center justify-between border border-border/50 rounded p-3 bg-muted/10">
        <span className="text-xs font-mono uppercase text-muted-foreground">Total Events</span>
        <span className="text-2xl font-bold font-mono text-primary">{total_events.toLocaleString()}</span>
      </div>

      {/* Territory leaderboard */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Territory Leaderboard</span>
        <div className="space-y-2">
          {territory_leaderboard.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">#{i + 1}</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-mono w-20 truncate">{entry.name}</span>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(entry.territory / maxTerritory) * 100}%`, backgroundColor: entry.color }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{entry.territory}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resource leaderboard */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Resource Leaderboard</span>
        <div className="space-y-2">
          {resource_leaderboard.map((entry, i) => (
            <div key={entry.id} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">#{i + 1}</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-mono w-20 truncate">{entry.name}</span>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(entry.resources / maxResources) * 100}%`, backgroundColor: '#fbbf24' }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{entry.resources}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat trends */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Global Stat Trends</span>
        <div className="grid grid-cols-2 gap-2">
          {(['aggression', 'defense', 'economy', 'exploration'] as const).map(stat => {
            const trend = stat_trends[stat] ?? 0;
            const isUp = trend > 0.1;
            const isDown = trend < -0.1;
            return (
              <div key={stat} className="border border-border/50 rounded p-2 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase" style={{ color: STAT_COLORS[stat] }}>
                  {stat.substring(0, 3)}
                </span>
                <div className="flex items-center gap-1">
                  {isUp ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : isDown ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : (
                    <Minus className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={`text-[10px] font-mono ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
