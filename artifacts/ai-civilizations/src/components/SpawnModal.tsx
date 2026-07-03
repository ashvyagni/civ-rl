import React, { useState } from 'react';
import { Plus, X, Dice6 } from 'lucide-react';
import { Button, cn } from './ui';
import { SWATCH_COLORS, randomFantasyName, randomCivStats } from '../types';

const STAT_KEYS = ['aggression', 'defense', 'economy', 'exploration'] as const;
const STAT_COLORS: Record<string, string> = {
  aggression: '#ef4444', defense: '#3b82f6', economy: '#22c55e', exploration: '#f97316',
};

interface SpawnModalProps {
  isOpen: boolean;
  usedColors: string[];
  onClose: () => void;
  onSpawn: (data: { name: string; color: string; stats: Record<string, number> }) => void;
}

export function SpawnModal({ isOpen, usedColors, onClose, onSpawn }: SpawnModalProps) {
  const [name, setName] = useState(() => randomFantasyName());
  const [color, setColor] = useState(() => {
    const free = SWATCH_COLORS.find(c => !usedColors.includes(c));
    return free ?? SWATCH_COLORS[0];
  });
  const [stats, setStats] = useState(() => randomCivStats());

  if (!isOpen) return null;

  const handleSpawn = () => {
    onSpawn({ name, color, stats });
    onClose();
    // Reset for next spawn
    setName(randomFantasyName());
    setStats(randomCivStats());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border shadow-2xl rounded-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-wider font-mono text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            DEPLOY NEW ENTITY
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-muted/30 border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              placeholder="Civilization name"
              maxLength={24}
            />
            <button
              onClick={() => setName(randomFantasyName())}
              className="w-9 h-9 flex items-center justify-center rounded border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary transition-colors text-muted-foreground hover:text-primary"
            >
              <Dice6 className="w-4 h-4" />
            </button>
          </div>

          {/* Color swatches */}
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-2">Color</div>
            <div className="flex flex-wrap gap-2">
              {SWATCH_COLORS.map(c => {
                const isOwn = color === c;
                const isTaken = !isOwn && usedColors.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => !isTaken && setColor(c)}
                    disabled={isTaken}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-all',
                      isOwn ? 'border-white scale-125 shadow-lg' : 'border-transparent',
                      isTaken ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110',
                    )}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Starting Stats</div>
              <button
                onClick={() => setStats(randomCivStats())}
                className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Dice6 className="w-3 h-3" /> RANDOMIZE
              </button>
            </div>
            {STAT_KEYS.map(stat => (
              <div key={stat} className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase w-7 shrink-0" style={{ color: STAT_COLORS[stat] }}>
                  {stat.substring(0, 3)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stats[stat]}
                  onChange={e => setStats(s => ({ ...s, [stat]: parseInt(e.target.value) }))}
                  className="flex-1"
                  style={{ accentColor: STAT_COLORS[stat] }}
                />
                <span className="text-[10px] font-mono w-6 text-right text-muted-foreground">{stats[stat]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/10">
          <Button variant="ghost" size="sm" onClick={onClose} className="font-mono text-xs">CANCEL</Button>
          <Button size="sm" onClick={handleSpawn} className="font-mono text-xs font-bold uppercase tracking-wider">
            DEPLOY CIV
          </Button>
        </div>
      </div>
    </div>
  );
}
