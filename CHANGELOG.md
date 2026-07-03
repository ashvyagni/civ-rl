# Changelog

## 2026-07-03 — Major Refactor & New Features

### Code Review & Cleanup

- **Removed duplicate/stale `src/` directory** at project root — was an incomplete earlier version of the frontend that was superseded by `artifacts/ai-civilizations/`.
- **Removed dead code** in `simulation.py` (unused `vals` variable in `_global_stats()`).
- **Fixed edge case** in `_do_attack` where enemy could be `None` or already dead after tile lookup — now returns cleanly instead of potentially crashing.
- **WebSocket handling** confirmed solid: reconnect logic with 2s timeout, error handler closes socket, broadcast snapshots client set for concurrency safety.

### Neural Decision Tree Visualization

- **New component: `DecisionTree.tsx`** — SVG-based tree/flow diagram rendering per-civ:
  - Root nodes: 4 stats (Aggression, Defense, Economy, Exploration) with live values
  - Leaf nodes: 5 actions (Explore, Gather, Attack, Fortify, Expand) with computed weights
  - Connecting lines: show stat→action influence; opacity highlights active paths
  - Winning action glows with animated pulse
  - Hover on any action shows exact computation math (breakdown × coefficients + tech bonuses)
- **History scrubber**: Slider beneath the tree scrubs through the last ~20 decisions per civ. Tree re-renders for each historical state, showing what the AI "saw" at that point.
- **Backend change**: `civ.py` now emits `action_details` — per-action breakdown including weight, stat contributions with coefficients, tech bonus multiplier, and softmax score.
- **Live updates**: Tree animates tick-by-tick as civ stats change, with highlighted path shifting in real time.

### Technology / Development Tree

- **Backend tech tree** defined in `civ.py`:
  - 4 branches (Aggression, Defense, Economy, Exploration) × 3 tiers each = 12 techs
  - Effects include: weight multipliers, tradeoff reductions, passive income, and tradeoff bonuses
- **Research mechanic**:
  - Civs accumulate research points passively each turn (`economy × 0.08` rate)
  - Auto-selects next tech based on dominant stat (consistent with stats-drive-behavior philosophy)
  - Techs progress through locked → in_progress → unlocked states
  - Unlocked techs immediately modify action weights and tradeoff calculations
- **Frontend: `TechTreePanel.tsx`** — collapsible tech tree in AI Brain panel:
  - Grid layout showing all 4 branches with their 3 tiers
  - Color-coded status icons (green checkmark = unlocked, yellow clock = researching, gray lock = locked)
  - Research point progress bar with current tech name
  - Integrated into AiBrainPanel as a toggleable section
- **Decision tree integration**: Tech bonuses appear as multipliers in the tree's computation display (e.g., "×1.20" from Bronze Weapons).

### Stat System

- **No new stats added** — evaluated Diplomacy, Culture, and Research options but found they would overcomplicate the existing clean tradeoff loop. Instead, **research rate is tied to Economy** (the natural choice), keeping the system simple while still enabling progression.
- The tech tree effectively serves the role of a "Research" dimension without requiring a new stat or action.

### Documentation

- **`README.md`** fully rewritten:
  - New sections for Neural Decision Tree Visualization and Technology Tree
  - Updated WebSocket protocol to include new fields (`action_details`, `techs`, `research_points`)
  - Updated project structure to document all new components
  - New entries in Frontend Controls table for AI Brain and History Scrubber
- **`CHANGELOG.md`** created (this file).
