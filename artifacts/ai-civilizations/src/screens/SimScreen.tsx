import React, { useState, useCallback } from 'react';
import {
  Activity, Play, Pause, ChevronRight, Plus, RotateCcw, ArrowLeft,
  Users, Terminal, Globe, Zap,
} from 'lucide-react';
import { Button, Badge, cn } from '../components/ui';
import { MapGrid } from '../components/MapGrid';
import { CivCard } from '../components/CivCard';
import { AiBrainPanel } from '../components/AiBrainPanel';
import { GlobalPanel } from '../components/GlobalPanel';
import { EndOverlay } from '../components/EndOverlay';
import { SpawnModal } from '../components/SpawnModal';
import type { SimState, WsStatus } from '../types';

const SPEED_OPTIONS = [
  { label: '¼×', value: 0.25 },
  { label: '½×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
];

type Tab = 'entities' | 'brain' | 'global';

interface SimScreenProps {
  simState: SimState | null;
  wsStatus: WsStatus;
  sendCommand: (cmd: Record<string, unknown>) => void;
  onBackToSetup: () => void;
}

export function SimScreen({ simState, wsStatus, sendCommand, onBackToSetup }: SimScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('entities');
  const [selectedCivId, setSelectedCivId] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(true);

  const paused = simState?.paused ?? false;
  const gameEnded = simState?.game_state === 'ended';

  const handlePauseResume = useCallback(() => {
    sendCommand({ cmd: paused ? 'resume' : 'pause' });
  }, [paused, sendCommand]);

  const handleStepOnce = useCallback(() => {
    sendCommand({ cmd: 'step_once' });
  }, [sendCommand]);

  const handleSpeed = useCallback((val: number) => {
    setSpeed(val);
    sendCommand({ cmd: 'set_speed', speed: val });
  }, [sendCommand]);

  const handleNudge = useCallback((civId: number, stat: string, delta: number) => {
    sendCommand({ cmd: 'nudge_stat', civ_id: civId, stat, delta });
  }, [sendCommand]);

  const handleResetCiv = useCallback((civId: number) => {
    sendCommand({ cmd: 'reset_civ', civ_id: civId });
  }, [sendCommand]);

  const handleSpawn = useCallback((data: { name: string; color: string; stats: Record<string, number> }) => {
    sendCommand({ cmd: 'spawn_civ', name: data.name, color: data.color, stats: data.stats });
  }, [sendCommand]);

  const handleResetAll = useCallback(() => {
    if (confirm('Reset this simulation run? This will start a new run with the same config.')) {
      sendCommand({ cmd: 'reset_all' });
      setShowEndOverlay(true);
    }
  }, [sendCommand]);

  const handlePlayAgain = useCallback(() => {
    onBackToSetup();
  }, [onBackToSetup]);

  const handleWatchReplay = useCallback(() => {
    setShowEndOverlay(false);
  }, []);

  const openBrain = useCallback((civId: number) => {
    setSelectedCivId(civId);
    setActiveTab('brain');
  }, []);

  const selectedCiv = simState?.civs.find(c => c.id === selectedCivId) ?? null;
  const aliveCivs = simState?.civs.filter(c => c.alive) ?? [];
  const usedColors = simState?.civs.map(c => c.color) ?? [];

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'entities', label: 'ENTITIES', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'brain', label: 'BRAIN', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'global', label: 'GLOBAL', icon: <Globe className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold tracking-widest text-primary uppercase drop-shadow-[0_0_8px_rgba(0,200,200,0.4)] hidden sm:block">
              AI Civilizations
            </h1>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div className={cn(
              'w-2 h-2 rounded-full',
              wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500',
            )} />
            <span className="text-muted-foreground uppercase hidden sm:inline">{wsStatus}</span>
          </div>
          <div className="font-mono text-xs border border-border px-2 py-1 rounded bg-muted/20">
            STEP <span className="text-primary font-bold ml-1">{simState?.step_number ?? 0}</span>
          </div>
          {paused && (
            <Badge variant="outline" className="font-mono text-[10px] text-yellow-400 border-yellow-400/40 animate-pulse">
              PAUSED
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* Play/Pause */}
          <Button variant="outline" size="sm" onClick={handlePauseResume} className="font-mono text-xs h-8 px-3">
            {paused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
            {paused ? 'RESUME' : 'PAUSE'}
          </Button>

          {/* Step once */}
          <Button variant="outline" size="sm" onClick={handleStepOnce} className="font-mono text-xs h-8 px-2" title="Step once">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          {/* Speed selector */}
          <div className="flex border border-border rounded overflow-hidden">
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSpeed(opt.value)}
                className={cn(
                  'px-2 h-8 text-[10px] font-mono transition-colors',
                  speed === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 text-muted-foreground hover:bg-primary/10 hover:text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Spawn */}
          <Button variant="outline" size="sm" onClick={() => setSpawnOpen(true)} className="font-mono text-xs h-8 px-3">
            <Plus className="w-3.5 h-3.5 mr-1" />
            SPAWN
          </Button>

          {/* Reset */}
          <Button variant="ghost" size="sm" onClick={handleResetAll} className="font-mono text-xs h-8 px-2 text-muted-foreground hover:text-destructive">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {/* Back to setup */}
          <Button variant="ghost" size="sm" onClick={onBackToSetup} className="font-mono text-xs h-8 px-2 text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            SETUP
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-3 gap-3">
        {/* Map column */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2 min-w-0">
          <div className="flex-1 rounded-md border border-border bg-[#030508] overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-background/50 backdrop-blur-sm border-b border-border/40">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                SATELLITE OVERVIEW — {simState?.grid_size ?? 15}×{simState?.grid_size ?? 15}
              </span>
              {simState?.command_result && (
                <span className="text-[10px] font-mono text-primary animate-pulse">{simState.command_result}</span>
              )}
            </div>
            <div className="w-full h-full pt-8">
              <MapGrid
                mapState={simState?.map_state ?? []}
                civs={simState?.civs ?? []}
                gridSize={simState?.grid_size ?? 15}
              />
            </div>
          </div>

          {/* Milestone strip */}
          {(simState?.milestone_log?.length ?? 0) > 0 && (
            <div className="flex gap-2 flex-wrap">
              {simState!.milestone_log.slice(-3).map((m, i) => (
                <div key={i} className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 bg-primary/5 text-primary/80 animate-in fade-in">
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-[480px] flex flex-col gap-0 border border-border rounded-md overflow-hidden shrink-0 bg-card">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-colors',
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'entities' && (
                  <span className="text-[9px] ml-0.5 opacity-60">({aliveCivs.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {/* ENTITIES tab */}
            {activeTab === 'entities' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
                {simState?.civs.map(civ => (
                  <CivCard
                    key={civ.id}
                    civ={civ}
                    onNudge={(stat, delta) => handleNudge(civ.id, stat, delta)}
                    onReset={() => handleResetCiv(civ.id)}
                    onOpenBrain={() => openBrain(civ.id)}
                    isSelected={selectedCivId === civ.id}
                  />
                ))}
                {!simState?.civs.length && (
                  <div className="flex flex-col items-center justify-center p-8 gap-3 text-muted-foreground">
                    <Zap className="w-8 h-8 opacity-30" />
                    <span className="font-mono text-sm">NO ENTITIES DETECTED</span>
                  </div>
                )}
              </div>
            )}

            {/* BRAIN tab */}
            {activeTab === 'brain' && (
              <div className="h-full overflow-hidden">
                <AiBrainPanel civ={selectedCiv} currentStep={simState?.step_number ?? 0} />
              </div>
            )}

            {/* GLOBAL tab */}
            {activeTab === 'global' && (
              <div className="h-full overflow-hidden">
                <GlobalPanel globalStats={simState?.global_stats ?? null} />
              </div>
            )}
          </div>

          {/* Event log strip */}
          <div className="border-t border-border shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/10">
              <Terminal className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Live Intel Feed</span>
            </div>
            <div className="h-28 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {(simState?.event_log ?? []).slice().reverse().map((ev, i) => (
                <div key={i} className="text-[10px] font-mono text-foreground/70 hover:text-foreground transition-colors leading-relaxed">
                  {ev}
                </div>
              ))}
              {!simState?.event_log?.length && (
                <div className="text-[10px] font-mono text-muted-foreground opacity-40 text-center pt-4">MONITORING...</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* End overlay */}
      {gameEnded && showEndOverlay && simState && (
        <EndOverlay
          simState={simState}
          onPlayAgain={handlePlayAgain}
          onWatchReplay={handleWatchReplay}
        />
      )}

      {/* Spawn modal */}
      <SpawnModal
        isOpen={spawnOpen}
        usedColors={usedColors}
        onClose={() => setSpawnOpen(false)}
        onSpawn={handleSpawn}
      />
    </div>
  );
}
