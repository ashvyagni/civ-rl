import React from 'react';
import type { Civilization } from '../types';
import { TECH_TREE_DEFINITION, TECH_BRANCH_COLORS } from '../types';
import { FlaskConical, Lock, CheckCircle, Clock } from 'lucide-react';

function findTechName(techId: string): string {
  for (const branch of Object.values(TECH_TREE_DEFINITION)) {
    const found = branch.find(t => t.id === techId);
    if (found) return found.name;
  }
  return techId;
}

interface TechTreePanelProps {
  civ: Civilization | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  unlocked: {
    icon: <CheckCircle className="w-3 h-3" />,
    className: 'text-green-400 border-green-500/30 bg-green-500/10',
    label: 'Unlocked',
  },
  in_progress: {
    icon: <Clock className="w-3 h-3 animate-pulse" />,
    className: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    label: 'Researching...',
  },
  locked: {
    icon: <Lock className="w-3 h-3" />,
    className: 'text-muted-foreground/40 border-border/30 bg-muted/5',
    label: 'Locked',
  },
};

export function TechTreePanel({ civ }: TechTreePanelProps) {
  if (!civ) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-xs opacity-60">
        Select a civilization to view its tech tree
      </div>
    );
  }

  const branches = Object.entries(TECH_TREE_DEFINITION) as [string, Array<{ id: string; name: string; description: string; cost: number }>][];

  return (
    <div className="flex flex-col gap-4">
      {/* Research progress */}
      <div className="flex items-center gap-3 bg-muted/10 border border-border/50 rounded-lg p-3">
        <FlaskConical className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Research Points</span>
            <span className="text-[11px] font-mono text-primary font-bold">{civ.research_points.toFixed(1)}</span>
          </div>
          {civ.researching && (
            <div className="text-[9px] font-mono text-yellow-400 truncate">
              Researching: {findTechName(civ.researching)}
            </div>
          )}
        </div>
      </div>

      {/* Tech branches */}
      <div className="grid grid-cols-2 gap-2">
        {branches.map(([branch, techs]) => {
          const color = TECH_BRANCH_COLORS[branch] ?? '#666';
          return (
            <div key={branch} className="border border-border/50 rounded-lg overflow-hidden">
              <div
                className="px-2 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${color}15`, color, borderBottom: `1px solid ${color}30` }}
              >
                {branch}
              </div>
              <div className="p-1.5 flex flex-col gap-1">
                {techs.map((tech) => {
                  const status = civ.techs?.[tech.id] ?? 'locked';
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.locked;
                  return (
                    <div
                      key={tech.id}
                      className={`text-[9px] font-mono px-2 py-1.5 rounded border flex items-center gap-1.5 ${cfg.className}`}
                      title={`${tech.name}: ${tech.description} (${tech.cost} RP)`}
                    >
                      <span className="shrink-0">{cfg.icon}</span>
                      <span className="truncate flex-1">{tech.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
