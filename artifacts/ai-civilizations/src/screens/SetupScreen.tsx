import React, { useState, useCallback } from 'react';
import { Activity, Dice6, Plus, Trash2, RotateCcw, Rocket } from 'lucide-react';
import { Button, Badge, cn } from '../components/ui';
import type { SimConfig, CivConfig, WsStatus } from '../types';
import {
  SWATCH_COLORS, randomFantasyName, randomCivStats, defaultCivStats,
} from '../types';

const MAP_SIZE_OPTIONS: Array<{ value: SimConfig['map_size']; label: string; desc: string }> = [
  { value: 'small', label: 'Small', desc: '10×10' },
  { value: 'medium', label: 'Medium', desc: '15×15' },
  { value: 'large', label: 'Large', desc: '20×20' },
];

const STAT_KEYS = ['aggression', 'defense', 'economy', 'exploration'] as const;
const STAT_COLORS: Record<string, string> = {
  aggression: '#ef4444', defense: '#3b82f6', economy: '#22c55e', exploration: '#f97316',
};

function makeCiv(i: number): CivConfig {
  return {
    name: randomFantasyName(),
    color: SWATCH_COLORS[i % SWATCH_COLORS.length],
    stats: randomCivStats(),
    position: null,
  };
}

function makeDefaultCivs(n: number): CivConfig[] {
  return Array.from({ length: n }, (_, i) => makeCiv(i));
}

interface CivBuilderCardProps {
  civ: CivConfig;
  index: number;
  usedColors: string[];
  mapSize: SimConfig['map_size'];
  onChange: (updated: CivConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const MAP_GRID_SIZES: Record<SimConfig['map_size'], number> = { small: 10, medium: 15, large: 20 };

function CivBuilderCard({ civ, index, usedColors, mapSize, onChange, onRemove, canRemove }: CivBuilderCardProps) {
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const gridSize = MAP_GRID_SIZES[mapSize];
  const cellPx = Math.floor(120 / gridSize);

  const updateStat = (stat: string, val: number) => {
    onChange({ ...civ, stats: { ...civ.stats, [stat]: val } });
  };

  const handleColorPick = (color: string) => {
    onChange({ ...civ, color });
  };

  const handlePositionPick = (r: number, c: number) => {
    const already = civ.position && civ.position[0] === r && civ.position[1] === c;
    onChange({ ...civ, position: already ? null : [r, c] });
  };

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 relative overflow-hidden"
      style={{ boxShadow: `0 0 20px ${civ.color}18` }}
    >
      {/* color glow bg */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-10"
        style={{ backgroundColor: civ.color }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: civ.color, boxShadow: `0 0 8px ${civ.color}` }} />
          <span className="font-mono text-xs text-muted-foreground">ENTITY {index + 1}</span>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Name row */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={civ.name}
          onChange={e => onChange({ ...civ, name: e.target.value })}
          className="flex-1 bg-muted/30 border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
          placeholder="Civilization name"
          maxLength={24}
        />
        <button
          onClick={() => onChange({ ...civ, name: randomFantasyName() })}
          title="Random name"
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary transition-colors text-muted-foreground hover:text-primary"
        >
          <Dice6 className="w-4 h-4" />
        </button>
      </div>

      {/* Color swatches */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SWATCH_COLORS.map(color => {
          const isOwn = civ.color === color;
          const isTaken = !isOwn && usedColors.includes(color);
          return (
            <button
              key={color}
              onClick={() => !isTaken && handleColorPick(color)}
              disabled={isTaken}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all',
                isOwn ? 'border-white scale-125 shadow-lg' : 'border-transparent',
                isTaken ? 'opacity-25 cursor-not-allowed' : 'hover:scale-110 cursor-pointer',
              )}
              style={{ backgroundColor: color }}
              title={isTaken ? 'Already taken' : color}
            />
          );
        })}
      </div>

      {/* Stat sliders */}
      <div className="space-y-3 mb-4">
        {STAT_KEYS.map(stat => (
          <div key={stat} className="flex items-center gap-3">
            <span
              className="text-xs font-mono uppercase w-8 shrink-0"
              style={{ color: STAT_COLORS[stat] }}
            >
              {stat.substring(0, 3)}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={civ.stats[stat]}
              onChange={e => updateStat(stat, parseInt(e.target.value))}
              className="flex-1 accent-primary h-1"
              style={{ accentColor: STAT_COLORS[stat] }}
            />
            <span className="text-xs font-mono w-6 text-right text-muted-foreground">{civ.stats[stat]}</span>
          </div>
        ))}
      </div>

      {/* Per-card actions */}
      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <button
          onClick={() => onChange({ ...civ, stats: randomCivStats() })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <Dice6 className="w-3 h-3" /> RANDOMIZE STATS
        </button>
        <button
          onClick={() => setShowPositionPicker(!showPositionPicker)}
          className={cn(
            'text-xs font-mono transition-colors',
            showPositionPicker ? 'text-primary' : 'text-muted-foreground hover:text-primary',
          )}
        >
          {civ.position ? `POS (${civ.position[0]},${civ.position[1]})` : 'SET POSITION'}
        </button>
      </div>

      {/* Position picker mini-map */}
      {showPositionPicker && (
        <div className="mt-3 border border-border/50 rounded p-2 bg-background/50">
          <div className="text-[10px] font-mono text-muted-foreground mb-2">Click to pin starting position</div>
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)` }}
          >
            {Array.from({ length: gridSize }, (_, r) =>
              Array.from({ length: gridSize }, (_, c) => {
                const isSelected = civ.position && civ.position[0] === r && civ.position[1] === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handlePositionPick(r, c)}
                    className={cn(
                      'cursor-pointer rounded-sm transition-all',
                      isSelected ? 'ring-1 ring-white' : 'hover:brightness-150',
                    )}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      backgroundColor: isSelected ? civ.color : '#0a0d14',
                      border: `1px solid rgba(255,255,255,0.05)`,
                    }}
                  />
                );
              })
            )}
          </div>
          {civ.position && (
            <button
              onClick={() => onChange({ ...civ, position: null })}
              className="mt-2 text-[10px] font-mono text-muted-foreground hover:text-destructive transition-colors"
            >
              CLEAR POSITION
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SetupScreenProps {
  onLaunch: (config: SimConfig) => void;
  wsStatus: WsStatus;
}

export function SetupScreen({ onLaunch, wsStatus }: SetupScreenProps) {
  const [numCivs, setNumCivs] = useState(4);
  const [randomizeCount, setRandomizeCount] = useState(false);
  const [mapSize, setMapSize] = useState<SimConfig['map_size']>('medium');
  const [resourceDensity, setResourceDensity] = useState(0.15);
  const [civs, setCivs] = useState<CivConfig[]>(() => makeDefaultCivs(4));

  const syncCivCount = (n: number, currentCivs: CivConfig[]) => {
    if (n > currentCivs.length) {
      return [...currentCivs, ...Array.from({ length: n - currentCivs.length }, (_, i) => makeCiv(currentCivs.length + i))];
    }
    return currentCivs.slice(0, n);
  };

  const handleNumCivs = (n: number) => {
    const clamped = Math.max(2, Math.min(8, n));
    setNumCivs(clamped);
    setCivs(prev => syncCivCount(clamped, prev));
  };

  const updateCiv = useCallback((i: number, updated: CivConfig) => {
    setCivs(prev => prev.map((c, idx) => idx === i ? updated : c));
  }, []);

  const removeCiv = useCallback((i: number) => {
    setCivs(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      setNumCivs(next.length);
      return next;
    });
  }, []);

  const addCiv = () => {
    if (civs.length < 8) {
      const n = civs.length;
      setNumCivs(n + 1);
      setCivs(prev => [...prev, makeCiv(n)]);
    }
  };

  const randomizeAll = () => {
    const count = randomizeCount ? (2 + Math.floor(Math.random() * 7)) : numCivs;
    const next = makeDefaultCivs(count);
    setNumCivs(count);
    setCivs(next);
  };

  const resetDefaults = () => {
    setNumCivs(4);
    setMapSize('medium');
    setResourceDensity(0.15);
    setCivs(makeDefaultCivs(4));
    setRandomizeCount(false);
  };

  const handleLaunch = () => {
    const count = randomizeCount ? (2 + Math.floor(Math.random() * 7)) : numCivs;
    const finalCivs = randomizeCount ? makeDefaultCivs(count) : civs;
    onLaunch({ map_size: mapSize, resource_density: resourceDensity, civs: finalCivs });
  };

  const usedColors = civs.map(c => c.color);

  const densityLabel = resourceDensity < 0.10 ? 'Sparse' : resourceDensity < 0.22 ? 'Standard' : 'Abundant';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(0,200,200,0.4)]">
            AI Civilizations
          </h1>
          <Badge variant="outline" className="font-mono text-[10px]">MISSION BUILDER</Badge>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={cn(
            'w-2 h-2 rounded-full',
            wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500',
          )} />
          <span className="text-muted-foreground uppercase">{wsStatus}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

          {/* Global settings */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              GLOBAL PARAMETERS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Num civs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Civilizations</label>
                  <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeCount}
                      onChange={e => setRandomizeCount(e.target.checked)}
                      className="w-3 h-3 accent-primary"
                    />
                    RANDOMIZE COUNT
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !randomizeCount && handleNumCivs(numCivs - 1)}
                    disabled={randomizeCount || numCivs <= 2}
                    className="w-8 h-8 rounded border border-border bg-muted/30 flex items-center justify-center font-mono hover:bg-primary/10 hover:border-primary disabled:opacity-30 transition-colors"
                  >−</button>
                  <div className="flex-1 text-center font-bold font-mono text-2xl text-primary">
                    {randomizeCount ? '?' : numCivs}
                  </div>
                  <button
                    onClick={() => !randomizeCount && handleNumCivs(numCivs + 1)}
                    disabled={randomizeCount || numCivs >= 8}
                    className="w-8 h-8 rounded border border-border bg-muted/30 flex items-center justify-center font-mono hover:bg-primary/10 hover:border-primary disabled:opacity-30 transition-colors"
                  >+</button>
                </div>
              </div>

              {/* Map size */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase text-muted-foreground">Map Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {MAP_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMapSize(opt.value)}
                      className={cn(
                        'rounded border px-2 py-2 text-center transition-all',
                        mapSize === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      <div className="text-xs font-bold font-mono">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resource density */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Resource Density</label>
                  <span className="text-xs font-mono text-primary">{densityLabel} ({Math.round(resourceDensity * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={Math.round(resourceDensity * 100)}
                  onChange={e => setResourceDensity(parseInt(e.target.value) / 100)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Sparse</span><span>Standard</span><span>Abundant</span>
                </div>
              </div>
            </div>
          </section>

          {/* Civ builder cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
                CIVILIZATION ROSTER
              </h2>
              <button
                onClick={addCiv}
                disabled={civs.length >= 8}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
              >
                <Plus className="w-3 h-3" /> ADD CIV
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {civs.map((civ, i) => (
                <CivBuilderCard
                  key={i}
                  civ={civ}
                  index={i}
                  usedColors={usedColors.filter((_, idx) => idx !== i)}
                  mapSize={mapSize}
                  onChange={updated => updateCiv(i, updated)}
                  onRemove={() => removeCiv(i)}
                  canRemove={civs.length > 2}
                />
              ))}
            </div>
          </section>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={randomizeAll} className="font-mono text-xs">
                <Dice6 className="w-4 h-4 mr-2" />
                RANDOMIZE ALL
              </Button>
              <Button variant="ghost" size="sm" onClick={resetDefaults} className="font-mono text-xs text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                RESET DEFAULTS
              </Button>
            </div>
            <Button
              size="lg"
              onClick={handleLaunch}
              disabled={wsStatus !== 'connected'}
              className="font-mono font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(0,200,200,0.4)] px-8"
            >
              <Rocket className="w-5 h-5 mr-2" />
              LAUNCH SIMULATION
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
