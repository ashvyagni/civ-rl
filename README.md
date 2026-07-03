# AI Civilizations — Live Stat-Driven Multi-Agent Simulation

A full-stack web app that simulates multiple AI-controlled civilizations on a shared grid map. Each civilization has dynamic stats that shift based on the outcomes of its actions, visibly changing its behavior in real time. Features a **neural decision tree visualization** that makes the AI's reasoning legible, and a **technology progression system** that unlocks permanent upgrades over time.

---


## How to Run

**Start the simulation backend:**
```
cd artifacts/sim-server && python3 server.py
```

**Start the React frontend:**
```
pnpm --filter @workspace/ai-civilizations run dev
```

Open the app — the frontend auto-connects via WebSocket and begins displaying the live simulation.

---

## Simulation Mechanics

### The Grid

A configurable 10×10 to 20×20 tile map generated on startup with:
- **Resource tiles** — civilizations can gather wealth from these
- **Territory tiles** — claimed land that belongs to a civilization
- **Unclaimed tiles** — neutral territory that can be explored or expanded into

### Civilizations

On each simulation start, **3–6 civilizations** are spawned at random positions, each with:
- A **name** and **color** for identification
- **Four stats** initialized to random values between 20–80

| Stat | Drives behavior |
|------|----------------|
| **Aggression** | Probability of attacking neighboring civs |
| **Defense** | Probability of fortifying / resistance to attacks |
| **Economy** | Probability of gathering resources |
| **Exploration** | Probability of exploring / expanding territory |

### Action Selection (the "AI")

Each turn, every civilization selects an action using **softmax over its stats as weights**. Higher Aggression → higher probability of choosing Attack, etc. This keeps the AI lightweight but emergent — civs with very high Exploration will naturally spread across the map, while high-Aggression civs will frequently clash.

Actions:
- **Explore** — move to an adjacent unclaimed or own tile
- **Gather** — collect resources from owned resource tiles
- **Attack** — assault an adjacent enemy-owned tile (outcome determined by Aggression vs Defense rolls)
- **Fortify** — reinforce borders (passive stat boost)
- **Expand** — claim an adjacent unclaimed tile peacefully

### Stat Tradeoff System

When an action resolves, stats update in linked pairs — specialization has costs:

| Event | Winner gains | Winner loses |
|-------|-------------|-------------|
| Exploration succeeds | Exploration +X | Defense −X/2 |
| Attack succeeds | Aggression +X | Economy −X/2 |
| Defense succeeds | Defense +X | Exploration −X/2 |
| Resource accumulation | Economy +X | Aggression −X/2 |
| Territory expansion | Exploration +X/2, Economy +X/2 | — |

All stats are clamped to **0–100**. A civ that wins many battles becomes increasingly aggressive but economically fragile. A civ that focuses on gathering grows wealthy but militarily passive. These emergent dynamics create interesting shifts in the simulation over time.

### Elimination

If a civilization loses all its territory tiles, it is eliminated from the simulation.

---

## Neural Decision Tree Visualization

The **AI Brain** panel shows more than just the final probability bar chart. It renders a live **decision tree** for the selected civilization:

- **Root nodes**: The civilization's 4 stats (Aggression, Defense, Economy, Exploration) with current values
- **Branch nodes**: Each candidate action (Explore, Gather, Attack, Fortify, Expand) with its computed weight
- **Connecting lines**: Show which stat contributes to which action. Hover over any node to see the exact computation — e.g., `AGGR(61.9)×1.15 + DEF(30)×0 = 71.2`
- **Highlighted path**: The winning action glows, making it immediately clear why the AI chose what it did
- **History scrubber**: Below the tree, a slider lets you scrub through the last ~20 decisions for that civ. Drag back to see the tree re-render at any past state — a true "training replay" feature.

This turns the AI from a black box into a transparent decision system, making the underlying softmax logic legible at a glance.

---

## Technology Tree

Civilizations research technologies that permanently unlock new capabilities, modify stat mechanics, or grant passive bonuses — giving the simulation a sense of progression beyond just "stats go up and down."

### Tech Structure

Four branches matching the four core stats, each with 3 tiers:

| Branch | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| **Aggression** | Bronze Weapons (attack weight +20%) | Siege Tactics (+30%, conquest bonus) | Warlord Doctrine (attack economy penalty halved) |
| **Defense** | Walls (fortify weight +20%) | Scouting Network (+30%) | Fortress Culture (fortifying boosts Economy) |
| **Economy** | Trade Routes (+1 resource/turn passive) | Banking (+2/turn, gather +20%) | Golden Age (gather yields doubled) |
| **Exploration** | Cartography (explore weight +20%) | Pioneer Spirit (+30%) | Diaspora (expand weight +40%) |

### Research Mechanic

- Civs accumulate **research points** passively each turn, with rate tied to their **Economy** stat
- Each civ auto-selects which tech to pursue based on its currently dominant stat — consistent with the existing "stats drive behavior" philosophy
- Techs are displayed in the AI Brain panel as a collapsible tree view with locked/in-progress/unlocked states
- Unlocked techs visibly affect the decision tree — a tech bonus like "+20% attack weight" appears as a multiplier in the tree's computation display

---

## WebSocket Protocol

The simulation backend runs a background async loop, ticking every ~600ms, independent of client connections.

### Broadcast (server → client, every tick)

```json
{
  "civs": [
    {
      "id": 0,
      "name": "Solari",
      "color": "#ef4444",
      "position": [7, 3],
      "stats": { "aggression": 61.9, "defense": 40.4, "economy": 31.8, "exploration": 79.9 },
      "territory_count": 4,
      "resources": 12,
      "alive": true,
      "stat_history": [...],
      "action_details": {
        "explore": { "weight": 79.9, "breakdown": [...], "tech_bonus": 1.0, "chosen": true }
      },
      "techs": { "bronze_weapons": "unlocked", "walls": "locked", ... },
      "research_points": 12.4,
      "researching": "siege_tactics"
    }
  ],
  "map_state": [...],
  "step_number": 42,
  "event_log": [...],
  "paused": false
}
```

### Commands (client → server)

```json
{ "cmd": "pause" }
{ "cmd": "resume" }
{ "cmd": "reset_all" }
{ "cmd": "nudge_stat", "civ_id": 0, "stat": "aggression", "delta": 20 }
{ "cmd": "spawn_civ", "stats": { "aggression": 80, "defense": 20, "economy": 50, "exploration": 50 } }
{ "cmd": "reset_civ", "civ_id": 2 }
```

---

## Project Structure

```
artifacts/
  sim-server/              # Python FastAPI simulation backend
    server.py              # FastAPI app + WebSocket endpoint + broadcast loop
    simulation.py          # Grid state, tile logic, step execution, command handling
    civ.py                 # Civilization class: stats, softmax AI, tradeoffs, tech tree
    requirements.txt
  ai-civilizations/        # React + Vite frontend
    src/
      App.tsx              # WebSocket lifecycle, screen routing
      types.ts             # TypeScript interfaces and constants
      screens/
        SetupScreen.tsx    # Configuration screen with civ builder
        SimScreen.tsx      # Live simulation dashboard
      components/
        AiBrainPanel.tsx   # AI deep-dive: decision tree, tech tree, stats, rewards
        DecisionTree.tsx   # SVG-based neural decision tree visualization
        TechTreePanel.tsx  # Technology tree per civilization
        CivCard.tsx        # Per-civ card with radar chart, stats, nudge controls
        MapGrid.tsx        # SVG grid map with territory colors, resources, civ markers
        GlobalPanel.tsx    # Leaderboards and stat trends
        EndOverlay.tsx     # End-of-simulation summary with radar comparison
        SpawnModal.tsx     # Mid-simulation civ spawning
        MilestoneToast.tsx # Toast notifications for milestones
    index.css             # Dark-mode theme (cyber-military aesthetic)
```

---

## Frontend Controls

| Control | What it does |
|---------|-------------|
| **Pause / Resume** | Freezes or resumes the simulation loop |
| **Speed selector** | ¼× to 4× simulation speed |
| **Step Once** | Advances exactly one tick |
| **Spawn Civ** | Injects a new civilization mid-simulation |
| **Reset All** | Restarts the entire simulation (new seed) |
| **Nudge Stats** | Per-civ +/− controls to manually push any stat |
| **Reset Civ** | Randomizes a civilization's stats back to a fresh 20–80 range |
| **AI Brain tab** | Opens decision tree, tech tree, stat trajectory, and reward history |
| **History scrubber** | Drag through the last ~20 decisions to replay past AI states |

---

## Technical Notes

- **Seeded randomness**: uses Python's `random.Random` — change `sim = Simulation(seed=42)` in `server.py` for reproducible runs.
- **Simulation loop independence**: the background tick task runs regardless of WebSocket connections; it skips broadcasts when no clients are connected.
- **Concurrency safety**: `_broadcast()` snapshots the client set before iterating, preventing `RuntimeError` from set mutation during async sends.

---

## Stretch Goals (not yet implemented)

- **Diplomacy / alliances** between civilizations
- **Real RL policy** per civ (replace softmax weighting with a trained policy network)
- **Save / replay** interesting simulation runs
- **Multiple resource types** with different strategic value
- **Culture/Influence** as passive territory conversion
