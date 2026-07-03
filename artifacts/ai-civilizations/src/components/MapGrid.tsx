import React, { useMemo } from 'react';
import type { Tile, Civilization } from '../types';

interface MapGridProps {
  mapState: Tile[];
  civs: Civilization[];
  gridSize: number;
}

export function MapGrid({ mapState, civs, gridSize }: MapGridProps) {
  if (!mapState || mapState.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono animate-pulse text-sm">
        AWAITING SATELLITE DATA...
      </div>
    );
  }

  const cellSize = 100;
  const viewBoxSize = gridSize * cellSize;

  const civMap = useMemo(() => {
    const m = new Map<string, Civilization>();
    civs.forEach(c => { if (c.alive) m.set(`${c.position[0]},${c.position[1]}`, c); });
    return m;
  }, [civs]);

  const civById = useMemo(() => {
    const m = new Map<number, Civilization>();
    civs.forEach(c => m.set(c.id, c));
    return m;
  }, [civs]);

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full object-contain rounded-md border border-border"
        style={{ maxWidth: '75vh', maxHeight: '75vh', background: '#030508' }}
      >
        <defs>
          <pattern id="gridbg" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          {/* Grass texture: subtle noise-like stripes */}
          <pattern id="grass" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <rect width={cellSize} height={cellSize} fill="#060c08" />
            <line x1="0" y1="33" x2={cellSize} y2="33" stroke="rgba(34,197,94,0.04)" strokeWidth="1" />
            <line x1="0" y1="66" x2={cellSize} y2="66" stroke="rgba(34,197,94,0.03)" strokeWidth="1" />
          </pattern>
          {/* Resource tile glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base background */}
        <rect width={viewBoxSize} height={viewBoxSize} fill="url(#grass)" />
        <rect width={viewBoxSize} height={viewBoxSize} fill="url(#gridbg)" />

        {/* Tiles */}
        {mapState.map((tile, idx) => {
          const owner = tile.owner_id !== null ? civById.get(tile.owner_id) : null;
          const x = tile.col * cellSize;
          const y = tile.row * cellSize;
          const civHere = civMap.get(`${tile.row},${tile.col}`);

          return (
            <g key={idx}>
              {/* Territory fill */}
              {owner && (
                <rect
                  x={x + 1} y={y + 1}
                  width={cellSize - 2} height={cellSize - 2}
                  fill={owner.color}
                  fillOpacity={owner.alive ? 0.18 : 0.06}
                  rx="4"
                />
              )}
              {/* Territory border — glow effect via stroke */}
              {owner && owner.alive && (
                <rect
                  x={x + 1} y={y + 1}
                  width={cellSize - 2} height={cellSize - 2}
                  fill="none"
                  stroke={owner.color}
                  strokeOpacity={0.55}
                  strokeWidth="2"
                  rx="4"
                />
              )}

              {/* Resource diamond */}
              {tile.resource > 0 && !civHere && (
                <g filter="url(#glow)">
                  <polygon
                    points={`${x + cellSize / 2},${y + cellSize * 0.3} ${x + cellSize * 0.7},${y + cellSize * 0.5} ${x + cellSize / 2},${y + cellSize * 0.7} ${x + cellSize * 0.3},${y + cellSize * 0.5}`}
                    fill={owner ? owner.color : '#fbbf24'}
                    fillOpacity={0.9}
                  >
                    <animate attributeName="fillOpacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
                  </polygon>
                </g>
              )}

              {/* Civ unit */}
              {civHere && (
                <g>
                  {/* Ping ring */}
                  <rect
                    x={x + 12} y={y + 12}
                    width={cellSize - 24} height={cellSize - 24}
                    fill="none"
                    stroke={civHere.color}
                    strokeWidth="3"
                    rx="12"
                    strokeOpacity="0.6"
                  >
                    <animate attributeName="rx" values="12;24;12" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="x" values={`${x + 12};${x + 6};${x + 12}`} dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="y" values={`${y + 12};${y + 6};${y + 12}`} dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="width" values={`${cellSize - 24};${cellSize - 12};${cellSize - 24}`} dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="height" values={`${cellSize - 24};${cellSize - 12};${cellSize - 24}`} dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="strokeOpacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite" />
                  </rect>

                  {/* Unit body */}
                  <rect
                    x={x + 12} y={y + 12}
                    width={cellSize - 24} height={cellSize - 24}
                    fill={civHere.color}
                    rx="12"
                  />

                  {/* Name abbreviation */}
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 13}
                    fill="#000"
                    fontSize={Math.max(24, cellSize * 0.36)}
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {civHere.name.substring(0, 2).toUpperCase()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
