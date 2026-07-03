# AI Civilizations

A full-stack, real-time simulation of multiple AI-controlled civilizations competing on a shared grid map. Each civilization is governed by four dynamic stats — Aggression, Defense, Economy, and Exploration — that shift based on the outcomes of its actions, visibly altering its behavior over time. The project makes the AI's decision-making transparent through a live neural decision tree visualization and introduces progression via a technology tree system.

Traditional AI simulations hide their reasoning behind opaque outputs. AI Civilizations exposes every step of the decision process: which stats contributed to each action, how technology bonuses modify weights, and why a particular action was chosen. This makes it useful as an educational tool for understanding softmax-based action selection, emergent multi-agent behavior, and stat-driven game design.

---

> **Screenshots / Demo**

> *Replace the placeholder below with actual screenshots or a recorded demo GIF.*

```
[ Screenshot: Setup Screen — configure civilizations and map parameters ]
[ Screenshot: Live Simulation — grid map with civ territories and stats ]
[ Screenshot: AI Brain Panel — decision tree, tech tree, and stat trends ]
```

---

## Features

| Feature | Description |
|---------|-------------|
| Real-time Simulation | Background tick loop (~600ms) drives the simulation independently of client connections. Multiple clients can connect simultaneously. |
| Neural Decision Tree Visualization | SVG-based tree showing stat-to-action influence paths, computed weights, tech multipliers, and the winning action with animated highlighting. |
| Stat Tradeoff System | Actions produce linked stat gains and losses — specialization has costs. A civ that wins many battles becomes aggressive but economically fragile. |
| Technology Tree | 4 branches x 3 tiers (12 techs total). Unlocked techs modify action weights, tradeoff penalties, and passive income. Research is auto-selected based on dominant stat. |
| Interactive Controls | Pause/resume, speed selector (0.25x-4x), step-once, spawn civ, nudge stats, reset civ, reset all. |
| History Scrubber | Slider to replay the last ~20 decisions for any civilization, re-rendering the decision tree at each historical state. |
| Configurable Setup | Choose map size (small/medium/large), resource density, and customize each civilization's name, color, and starting stats. |
| Milestone Notifications | Toast alerts when civilizations hit territory thresholds or achieve map dominance. |
| End-of-Simulation Overlay | Radar chart comparison of all surviving civilizations when a winner is determined. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React + Vite (SPA)                    │
│         SetupScreen / SimScreen / Components             │
│   MapGrid  │  CivCard  │  AiBrainPanel  │  TechTree     │
└────────────────────┬────────────────────────────────────┘
                     │  WebSocket (ws://host/ws/simulate)
                     │  JSON messages every ~600ms
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI (Python 3.13+)                  │
│           WebSocket endpoint + CORS middleware           │
│              Background async simulation loop            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Simulation Engine                      │
│  simulation.py  ─  Grid state, tile logic, step loop    │
│  civ.py          ─  Civilization, softmax AI, tech tree  │
└─────────────────────────────────────────────────────────┘
```

The frontend and backend communicate exclusively over a single WebSocket connection. The backend runs a background `asyncio` task that ticks the simulation at a fixed interval, broadcasting the full game state to all connected clients each tick. Clients send commands (pause, spawn, nudge, etc.) as JSON messages over the same socket. The Vite dev server proxies `/ws` to `localhost:8000` so no CORS issues arise during development.

---

## Project Structure

```
Civilization-AI/
├── artifacts/
│   ├── sim-server/                   # Python FastAPI simulation backend
│   │   ├── server.py                 # FastAPI app, WebSocket endpoint, broadcast loop
│   │   ├── simulation.py             # Grid state, tile logic, step execution, command handling
│   │   ├── civ.py                    # Civilization class: stats, softmax AI, tradeoffs, tech tree
│   │   └── requirements.txt          # Python dependencies
│   │
│   └── ai-civilizations/             # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx               # WebSocket lifecycle, screen routing
│       │   ├── types.ts              # TypeScript interfaces, constants, tech tree definition
│       │   ├── screens/
│       │   │   ├── SetupScreen.tsx   # Configuration screen with civ builder
│       │   │   └── SimScreen.tsx     # Live simulation dashboard
│       │   ├── components/
│       │   │   ├── AiBrainPanel.tsx  # AI deep-dive: decision tree, tech tree, stats, rewards
│       │   │   ├── DecisionTree.tsx  # SVG-based neural decision tree visualization
│       │   │   ├── TechTreePanel.tsx # Technology tree per civilization
│       │   │   ├── CivCard.tsx       # Per-civ card with radar chart, stats, nudge controls
│       │   │   ├── MapGrid.tsx       # SVG grid map with territory colors, resources, civ markers
│       │   │   ├── GlobalPanel.tsx   # Leaderboards and stat trends
│       │   │   ├── EndOverlay.tsx    # End-of-simulation summary with radar comparison
│       │   │   ├── SpawnModal.tsx    # Mid-simulation civ spawning
│       │   │   └── MilestoneToast.tsx# Toast notifications for milestones
│       │   ├── hooks/                # Custom React hooks
│       │   ├── lib/                  # Utility functions
│       │   └── index.css             # Dark-mode theme (cyber-military aesthetic)
│       ├── vite.config.ts            # Vite config with WebSocket proxy
│       ├── tsconfig.json
│       └── package.json
│
├── lib/                              # Shared packages (monorepo)
│   ├── api-spec/                     # OpenAPI spec + Orval code generation
│   ├── api-client-react/             # Generated React API client
│   ├── api-zod/                      # Zod schemas from API spec
│   └── db/                           # Drizzle ORM schema + config
│
├── scripts/                          # Dev scripts (TypeScript + shell)
├── pyproject.toml                    # Python project metadata
├── pnpm-workspace.yaml               # pnpm monorepo workspace config
├── package.json                      # Root package (typecheck, build)
└── tsconfig.base.json                # Shared TypeScript config
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.13+ |
| Node.js | 18+ |
| pnpm | 9+ |

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd Civilization-AI
```

### Install Backend (Python)

```bash
cd artifacts/sim-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

Alternatively, using `uv`:

```bash
uv sync
```

### Install Frontend (Node.js)

```bash
pnpm install
```

---

## Running Locally

### Start the Simulation Backend

```bash
cd artifacts/sim-server && python3 server.py
```

The server starts on `http://localhost:8000`. The WebSocket endpoint is at `ws://localhost:8000/ws/simulate`.

### Start the React Frontend

```bash
pnpm --filter @workspace/ai-civilizations run dev
```

The frontend starts on `http://localhost:3000` and proxies WebSocket connections to the backend automatically.

Open the app in your browser — the frontend auto-connects via WebSocket and begins displaying the live simulation.

---

## Deployment

The project consists of two independent services that can be deployed separately.

### Frontend

The frontend is a static SPA built with Vite. Deploy the contents of `artifacts/ai-civilizations/dist/public/` to any static hosting provider:

| Provider | Notes |
|----------|-------|
| Vercel | Set root directory to `artifacts/ai-civilizations`. Build command: `pnpm --filter @workspace/ai-civilizations run build`. |
| Netlify | Similar to Vercel. Ensure `dist/public` is the publish directory. |
| Cloudflare Pages | Build with Node.js 18+. No special config needed. |

**Required environment variable:** Set the WebSocket URL to point to your backend deployment (update the connection logic in `App.tsx` or inject via environment variable).

### Backend

The backend is a long-running Python process with a WebSocket server. It **cannot** be deployed to serverless platforms — use a container-based or VPS provider:

| Provider | Notes |
|----------|-------|
| Railway | Supports WebSocket out of the box. Set `PORT` env var. |
| Render | Use a background worker or web service with WebSocket enabled. |
| Fly.io | Deploy with a `Dockerfile`. WebSocket works natively. |
| VPS | Run `python3 server.py` behind a reverse proxy (nginx/caddy) with WebSocket upgrade support. |

**Required environment variable:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Port the FastAPI server listens on. |

The backend has no database dependency — all state is held in memory for the duration of the simulation.

---

## Simulation Mechanics

### The Grid

A configurable tile map generated on startup:

| Map Size | Dimensions | Total Tiles |
|----------|------------|-------------|
| Small | 10x10 | 100 |
| Medium | 15x15 | 225 |
| Large | 20x20 | 400 |

Tile types:

| Type | Description |
|------|-------------|
| Resource | Generates resources when gathered by the owning civilization. Density is configurable (5%-40%). |
| Territory | Claimed land belonging to a civilization. |
| Unclaimed | Neutral territory that can be explored or expanded into. |

### Civilizations

On each simulation start, 3-6 civilizations are spawned at random positions (or user-configured positions), each with:

| Property | Description |
|----------|-------------|
| Name | User-defined or randomly generated fantasy name. |
| Color | Visual identifier on the map. |
| Four Stats | Initialized to random values between 20-80. |

#### Civilization Stats

| Stat | Purpose | Drives Action |
|------|---------|---------------|
| Aggression | Probability of attacking neighboring civs | Attack |
| Defense | Probability of fortifying / resistance to attacks | Fortify |
| Economy | Probability of gathering resources | Gather |
| Exploration | Probability of exploring / expanding territory | Explore, Expand |

### Actions

Each turn, every civilization selects one action using **softmax over its stats as weights**. Higher Aggression increases the probability of choosing Attack, and so on.

| Action | Description |
|--------|-------------|
| Explore | Move to an adjacent unclaimed or own tile. |
| Gather | Collect resources from owned resource tiles. |
| Attack | Assault an adjacent enemy-owned tile (outcome determined by Aggression vs Defense rolls). |
| Fortify | Reinforce borders (passive stat boost). |
| Expand | Claim an adjacent unclaimed tile peacefully. |

### Stat Tradeoff System

When an action resolves, stats update in linked pairs — specialization has costs:

| Event | Winner Gains | Winner Loses |
|-------|-------------|-------------|
| Exploration succeeds | Exploration +X | Defense -X/2 |
| Attack succeeds | Aggression +X | Economy -X/2 |
| Defense succeeds | Defense +X | Exploration -X/2 |
| Resource accumulation | Economy +X | Aggression -X/2 |
| Territory expansion | Exploration +X/2, Economy +X/2 | -- |

All stats are clamped to 0-100. A civ that wins many battles becomes increasingly aggressive but economically fragile. A civ that focuses on gathering grows wealthy but militarily passive.

### Elimination and Victory

| Condition | Result |
|-----------|--------|
| Civilization loses all territory | Eliminated from the simulation |
| One civilization controls 50%+ of the map | Simulation ends, that civ wins |
| Only one civilization remains | Simulation ends, that civ wins |
| 500 steps reached | Simulation ends, civ with most territory wins |

---

## Technology Tree

Civilizations research technologies that permanently unlock new capabilities, modify stat mechanics, or grant passive bonuses.

### Tech Branches

| Branch | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| Aggression | Bronze Weapons (attack weight +20%) | Siege Tactics (+30%, conquest bonus) | Warlord Doctrine (attack economy penalty halved) |
| Defense | Walls (fortify weight +20%) | Scouting Network (+30%) | Fortress Culture (fortifying boosts Economy) |
| Economy | Trade Routes (+1 resource/turn passive) | Banking (+2/turn, gather +20%) | Golden Age (gather yields doubled) |
| Exploration | Cartography (explore weight +20%) | Pioneer Spirit (+30%) | Diaspora (expand weight +40%) |

### Research Mechanic

| Aspect | Behavior |
|--------|----------|
| Research rate | `economy_stat * 0.08` points per turn |
| Tech selection | Auto-selected based on the civilization's currently dominant stat |
| Prerequisites | Tier 2 requires Tier 1 unlocked; Tier 3 requires Tier 2 unlocked |
| States | `locked` -> `in_progress` -> `unlocked` |
| Effect timing | Unlocked techs immediately modify action weights and tradeoff calculations |

---

## AI Decision System

### Softmax Action Selection

Each tick, the civilization computes a weight for each action based on its stats and technology bonuses:

```
base_weight = stat_value * tech_multiplier
```

The weights are then passed through softmax with temperature=20:

```
probability(action_i) = exp(weight_i / T) / sum(exp(weight_j / T) for all j)
```

This keeps the AI lightweight but emergent — civs with very high Exploration will naturally spread across the map, while high-Aggression civs will frequently clash.

### Decision Tree Transparency

The decision tree visualization renders:

- **Root nodes**: The 4 stats with current values
- **Branch nodes**: Each candidate action with its computed weight
- **Connecting lines**: Show which stat contributes to which action (with opacity indicating influence strength)
- **Highlighted path**: The winning action glows with animated pulse
- **Hover details**: Exact computation math (e.g., `AGGR(61.9) x 1.15 + DEF(30) x 0 = 71.2`)

---

## WebSocket Protocol

The simulation backend runs a background async loop, ticking every ~600ms, independent of client connections.

### Server -> Client (every tick)

```json
{
  "civs": [
    {
      "id": 0,
      "name": "Solari",
      "color": "#ef4444",
      "position": [7, 3],
      "stats": {
        "aggression": 61.9,
        "defense": 40.4,
        "economy": 31.8,
        "exploration": 79.9
      },
      "territory_count": 4,
      "resources": 12,
      "alive": true,
      "stat_history": [],
      "action_details": {
        "explore": {
          "weight": 79.9,
          "breakdown": [
            { "stat": "exploration", "value": 79.9, "coefficient": 1.0 }
          ],
          "tech_bonus": 1.0,
          "score": 42.1,
          "chosen": true
        }
      },
      "techs": {
        "bronze_weapons": "unlocked",
        "walls": "locked"
      },
      "research_points": 12.4,
      "researching": "siege_tactics"
    }
  ],
  "map_state": [
    { "row": 0, "col": 0, "owner_id": null, "resource": 0 }
  ],
  "step_number": 42,
  "event_log": ["..."],
  "milestone_log": ["..."],
  "paused": false,
  "game_state": "running",
  "winner_id": null,
  "winner_name": null,
  "grid_size": 15,
  "tick_interval": 0.6,
  "global_stats": {
    "total_events": 312,
    "territory_leaderboard": [],
    "resource_leaderboard": [],
    "stat_trends": {}
  }
}
```

### Client -> Server Commands

```json
{ "cmd": "pause" }
{ "cmd": "resume" }
{ "cmd": "step_once" }
{ "cmd": "set_speed", "speed": 2.0 }
{ "cmd": "reset_all", "config": { "map_size": "large", "seed": 42 } }
{ "cmd": "start", "config": { "map_size": "medium", "civs": [] } }
{ "cmd": "nudge_stat", "civ_id": 0, "stat": "aggression", "delta": 20 }
{ "cmd": "spawn_civ", "stats": { "aggression": 80, "defense": 20, "economy": 50, "exploration": 50 } }
{ "cmd": "reset_civ", "civ_id": 2 }
```

---

## Technical Notes

- **Seeded randomness**: Uses Python's `random.Random`. Pass a seed via the `start` command config or change `sim = Simulation(seed=42)` in `server.py` for reproducible runs.
- **Simulation loop independence**: The background tick task runs regardless of WebSocket connections. It skips broadcasts when no clients are connected but continues advancing the simulation state.
- **Concurrency safety**: `_broadcast()` snapshots the client set (`list(_clients)`) before iterating, preventing `RuntimeError` from set mutation during async sends. Dead connections are cleaned up after the broadcast pass.
- **WebSocket reconnection**: The frontend attempts to reconnect every 2 seconds on disconnect. The current state is sent immediately upon connection.
- **Tick interval**: Default 600ms. Adjustable via the `set_speed` command (formula: `0.6 / speed` seconds).
- **Stat history**: Each civilization retains the last 60 stat snapshots. The frontend displays the last 30.

---

## Roadmap

- [ ] Diplomacy / alliances between civilizations
- [ ] Save / replay interesting simulation runs
- [ ] Reinforcement Learning agents (replace softmax with trained policy networks)
- [ ] Multiple resource types with different strategic value
- [ ] Culture/Influence as passive territory conversion mechanic
- [ ] Persistent database for simulation history
- [ ] Multiplayer observer mode with shared controls

---

## Contributing

Contributions are welcome. The project uses a pnpm workspace monorepo structure.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run typechecking: `pnpm run typecheck`
5. Run build: `pnpm run build`
6. Commit your changes and open a pull request

---

## License

MIT
