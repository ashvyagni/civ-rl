import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SetupScreen } from './screens/SetupScreen';
import { SimScreen } from './screens/SimScreen';
import { MilestoneToast } from './components/MilestoneToast';
import type { SimState, SimConfig, WsStatus } from './types';

export interface Toast {
  id: number;
  msg: string;
}

function App() {
  const [screen, setScreen] = useState<'setup' | 'sim'>('setup');
  const [simState, setSimState] = useState<SimState | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const toastIdRef = useRef(0);
  const prevMilestonesRef = useRef<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/simulate`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setWsStatus('connected');
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const state: SimState = JSON.parse(event.data as string);
          setSimState(state);

          // Detect and queue new milestone entries
          const prev = prevMilestonesRef.current;
          const newEntries = (state.milestone_log || []).filter(m => !prev.includes(m));
          if (newEntries.length > 0) {
            newEntries.forEach(msg => {
              const id = ++toastIdRef.current;
              setToasts(t => [...t.slice(-2), { id, msg }]);
              setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
            });
            prevMilestonesRef.current = state.milestone_log || [];
          }
        } catch (e) {
          console.error('Failed to parse sim state', e);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          setWsStatus('disconnected');
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, []);

  const sendCommand = useCallback((cmd: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const handleLaunch = useCallback((config: SimConfig) => {
    prevMilestonesRef.current = [];
    setToasts([]);
    sendCommand({ cmd: 'start', config });
    setScreen('sim');
  }, [sendCommand]);

  const handleBackToSetup = useCallback(() => {
    sendCommand({ cmd: 'pause' });
    setScreen('setup');
  }, [sendCommand]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {screen === 'setup' && (
        <SetupScreen onLaunch={handleLaunch} wsStatus={wsStatus} />
      )}
      {screen === 'sim' && (
        <SimScreen
          simState={simState}
          wsStatus={wsStatus}
          sendCommand={sendCommand}
          onBackToSetup={handleBackToSetup}
        />
      )}
      <MilestoneToast toasts={toasts} />
    </div>
  );
}

export default App;
