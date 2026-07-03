import React, { useState } from 'react';
import type { Civilization, ActionDetail, ActionBreakdownItem } from '../types';
import { STAT_COLORS, ACTION_COLORS } from '../types';

const STAT_KEYS = ['aggression', 'defense', 'economy', 'exploration'] as const;
const ACTIONS = ['explore', 'gather', 'attack', 'fortify', 'expand'] as const;
const STAT_LABELS: Record<string, string> = {
  aggression: 'AGGR',
  defense: 'DEF',
  economy: 'ECO',
  exploration: 'EXP',
};

const ACTION_LABELS: Record<string, string> = {
  explore: 'EXPLORE',
  gather: 'GATHER',
  attack: 'ATTACK',
  fortify: 'FORTIFY',
  expand: 'EXPAND',
};

const W = 360;
const H = 380;
const STAT_X = 40;
const ACTION_X = 260;
const STAT_SPACING = 70;
const ACTION_SPACING = 55;
const STAT_START_Y = 50;
const ACTION_START_Y = 60;

function getStatY(index: number): number {
  return STAT_START_Y + index * STAT_SPACING;
}

function getActionY(index: number): number {
  return ACTION_START_Y + index * ACTION_SPACING;
}

function getBreakdownText(breakdown: ActionBreakdownItem[]): string {
  return breakdown
    .map((b) => `${STAT_LABELS[b.stat] ?? b.stat}(${b.value})×${b.coefficient}=${(b.value * b.coefficient).toFixed(1)}`)
    .join(' + ');
}

interface DecisionTreeProps {
  civ: Civilization | null;
  decisionSnapshot?: {
    stats: Record<string, number>;
    actionDetails: Record<string, ActionDetail>;
    chosenAction: string;
  } | null;
}

export function DecisionTree({ civ, decisionSnapshot }: DecisionTreeProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  if (!civ) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground font-mono text-xs opacity-60">
        No civilization selected
      </div>
    );
  }

  const stats = decisionSnapshot?.stats ?? civ.stats;
  const actionDetails = decisionSnapshot?.actionDetails ?? civ.action_details;
  const chosenAction = decisionSnapshot?.chosenAction ?? civ.last_action;

  const hasDetails = actionDetails && Object.keys(actionDetails).length > 0;
  const maxWeight = hasDetails
    ? Math.max(...Object.values(actionDetails).map((d) => d.weight))
    : 1;

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minHeight: H, maxWidth: W }}
      >
        <defs>
          <filter id="glowChosen">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines: stat → action */}
        {hasDetails &&
          STAT_KEYS.flatMap((stat, si) =>
            ACTIONS.map((action, ai) => {
              const detail = actionDetails[action];
              if (!detail) return null;
              const breakdownItem = detail.breakdown.find((b) => b.stat === stat);
              if (!breakdownItem || breakdownItem.coefficient === 0) return null;
              const isChosen = action === chosenAction;
              const isHoveredAction = action === hoveredAction;
              const isHoveredStat = stat === hoveredStat;
              const isHighlighted = isChosen || isHoveredAction || isHoveredStat;
              const opacity = isHighlighted ? 0.7 : 0.15;

              const x1 = STAT_X + 28;
              const y1 = getStatY(si);
              const x2 = ACTION_X - 4;
              const y2 = getActionY(ai);

              return (
                <g key={`${stat}-${action}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={STAT_COLORS[stat]}
                    strokeWidth={isChosen ? 2.5 : 1.5}
                    strokeOpacity={opacity}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })
          )}

        {/* Stat nodes */}
        {STAT_KEYS.map((stat, i) => {
          const y = getStatY(i);
          const val = stats[stat] ?? 0;
          const isHovered = stat === hoveredStat;
          return (
            <g
              key={stat}
              onMouseEnter={() => setHoveredStat(stat)}
              onMouseLeave={() => setHoveredStat(null)}
              className="cursor-pointer"
            >
              <rect
                x={STAT_X - 28}
                y={y - 18}
                width={56}
                height={36}
                rx="8"
                fill={STAT_COLORS[stat]}
                fillOpacity={isHovered ? 0.25 : 0.15}
                stroke={STAT_COLORS[stat]}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={0.6}
                className="transition-all duration-200"
              />
              <text
                x={STAT_X}
                y={y - 2}
                textAnchor="middle"
                fill={STAT_COLORS[stat]}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                {STAT_LABELS[stat]}
              </text>
              <text
                x={STAT_X}
                y={y + 12}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Action nodes */}
        {ACTIONS.map((action, i) => {
          const y = getActionY(i);
          const detail = actionDetails?.[action];
          const weight = detail?.weight ?? 0;
          const isChosen = action === chosenAction;
          const isHovered = action === hoveredAction;
          const pct = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
          const color = ACTION_COLORS[action];

          return (
            <g
              key={action}
              onMouseEnter={() => setHoveredAction(action)}
              onMouseLeave={() => setHoveredAction(null)}
              className="cursor-pointer"
            >
              {isChosen && (
                <rect
                  x={ACTION_X - 42}
                  y={y - 16}
                  width={84}
                  height={32}
                  rx="8"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity="0.6"
                  filter="url(#glowChosen)"
                  className="animate-pulse"
                />
              )}
              <rect
                x={ACTION_X - 40}
                y={y - 14}
                width={80}
                height={28}
                rx="6"
                fill={color}
                fillOpacity={isHovered ? 0.2 : 0.1}
                stroke={color}
                strokeWidth={isChosen ? 2.5 : isHovered ? 2 : 1}
                strokeOpacity={isChosen ? 1 : 0.4}
                className="transition-all duration-200"
              />
              <text
                x={ACTION_X}
                y={y + 1}
                textAnchor="middle"
                fill={color}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={isChosen ? 'bold' : 'normal'}
              >
                {ACTION_LABELS[action]}
              </text>
              <text
                x={ACTION_X}
                y={y + 12}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                opacity={0.8}
              >
                {weight.toFixed(1)}
              </text>

              {/* Weight bar */}
              {!isChosen && pct > 5 && (
                <rect
                  x={ACTION_X + 42}
                  y={y - 6}
                  width={Math.min(pct * 0.5, 50)}
                  height={12}
                  rx="2"
                  fill={color}
                  fillOpacity={0.3}
                />
              )}

              {/* Tooltip on hover */}
              {isHovered && detail && (
                <g>
                  <rect
                    x={Math.min(ACTION_X - 100, 10)}
                    y={y - 55}
                    width={220}
                    height={50}
                    rx="4"
                    fill="#1a1a2e"
                    fillOpacity="0.95"
                    stroke={color}
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={Math.min(ACTION_X - 100, 10) + 10}
                    y={y - 40}
                    fill={color}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {ACTION_LABELS[action]}
                  </text>
                  <text
                    x={Math.min(ACTION_X - 100, 10) + 10}
                    y={y - 28}
                    fill="rgba(255,255,255,0.8)"
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {getBreakdownText(detail.breakdown)}
                  </text>
                  <text
                    x={Math.min(ACTION_X - 100, 10) + 10}
                    y={y - 16}
                    fill={color}
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Tech: ×{detail.tech_bonus} | Score: {detail.score.toFixed(1)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Legend / chosen label */}
        {chosenAction && (
          <text
            x={W / 2}
            y={H - 12}
            textAnchor="middle"
            fill={ACTION_COLORS[chosenAction]}
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
            opacity="0.8"
          >
            ► CHOSEN: {ACTION_LABELS[chosenAction]}
          </text>
        )}
      </svg>
    </div>
  );
}
