from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

from civ import Civilization, STAT_NAMES

MAP_SIZES: Dict[str, int] = {"small": 10, "medium": 15, "large": 20}
DEFAULT_GRID_SIZE = 15

DOMINANCE_THRESHOLD = 0.50
MAX_STEPS = 500

CIV_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
CIV_NAMES = ["Solari", "Umbra", "Verdant", "Ironhold", "Celestia", "Crimson", "Azurath", "Thornwall"]


@dataclass
class Tile:
    row: int
    col: int
    owner_id: Optional[int] = None
    resource: int = 0

    def to_dict(self) -> dict:
        return {
            "row": self.row,
            "col": self.col,
            "owner_id": self.owner_id,
            "resource": self.resource,
        }


class Simulation:
    def __init__(self, seed: Optional[int] = None) -> None:
        self.seed = seed if seed is not None else random.randint(0, 2**32)
        self.rng = random.Random(self.seed)
        self.grid_size: int = DEFAULT_GRID_SIZE
        self.grid: List[List[Tile]] = []
        self.civs: List[Civilization] = []
        self.step_number: int = 0
        self.event_log: List[str] = []
        self.milestone_log: List[str] = []
        self.paused: bool = False
        self.game_state: str = "running"
        self.winner_id: Optional[int] = None
        self.winner_name: Optional[str] = None
        self.total_events: int = 0
        self.tick_interval: float = 0.6
        self._last_config: dict = {}
        self._reset()

    def _adjacent(self, row: int, col: int) -> List[Tuple[int, int]]:
        out = []
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = row + dr, col + dc
            if 0 <= nr < self.grid_size and 0 <= nc < self.grid_size:
                out.append((nr, nc))
        return out

    def _frontier(self, civ: Civilization) -> List[Tuple[int, int]]:
        owned: Set[Tuple[int, int]] = set(civ.territory)
        frontier: Set[Tuple[int, int]] = set()
        for r, c in owned:
            for pos in self._adjacent(r, c):
                if pos not in owned:
                    frontier.add(pos)
        return list(frontier)

    def _log(self, msg: str) -> None:
        self.event_log.append(msg)
        self.total_events += 1
        if len(self.event_log) > 100:
            self.event_log = self.event_log[-100:]

    def _milestone(self, msg: str) -> None:
        self.milestone_log.append(msg)
        self._log(msg)
        if len(self.milestone_log) > 20:
            self.milestone_log = self.milestone_log[-20:]

    def _reset(self, config: Optional[dict] = None) -> None:
        if config is not None:
            self._last_config = config
        else:
            config = self._last_config

        map_size = config.get("map_size", "medium")
        self.grid_size = MAP_SIZES.get(map_size, DEFAULT_GRID_SIZE)

        density = 0.15
        try:
            density = max(0.05, min(0.40, float(config.get("resource_density", 0.15))))
        except (TypeError, ValueError):
            pass
        resource_count = max(5, int(self.grid_size * self.grid_size * density))

        if "seed" in config:
            try:
                self.seed = int(config["seed"])
            except (TypeError, ValueError):
                self.seed = random.randint(0, 2**32)
        else:
            self.seed = random.randint(0, 2**32)

        self.rng = random.Random(self.seed)
        self.grid = [[Tile(r, c) for c in range(self.grid_size)] for r in range(self.grid_size)]
        self.civs = []
        self.step_number = 0
        self.event_log = []
        self.milestone_log = []
        self.paused = False
        self.game_state = "running"
        self.winner_id = None
        self.winner_name = None
        self.total_events = 0

        all_positions = [(r, c) for r in range(self.grid_size) for c in range(self.grid_size)]

        resource_positions = self.rng.sample(all_positions, min(resource_count, len(all_positions)))
        for r, c in resource_positions:
            self.grid[r][c].resource = 1

        civ_configs: List[dict] = list(config.get("civs", []))
        if not civ_configs:
            num_civs = self.rng.randint(3, 5)
            civ_configs = [
                {
                    "name": CIV_NAMES[i % len(CIV_NAMES)],
                    "color": CIV_COLORS[i % len(CIV_COLORS)],
                    "stats": {stat: round(self.rng.uniform(20, 80), 1) for stat in STAT_NAMES},
                }
                for i in range(num_civs)
            ]

        used_positions: Set[Tuple[int, int]] = set()
        for i, cc in enumerate(civ_configs):
            pos_raw = cc.get("position")
            chosen_pos: Optional[Tuple[int, int]] = None
            if pos_raw is not None:
                try:
                    r2, c2 = int(pos_raw[0]), int(pos_raw[1])
                    if 0 <= r2 < self.grid_size and 0 <= c2 < self.grid_size and (r2, c2) not in used_positions:
                        chosen_pos = (r2, c2)
                except (TypeError, ValueError, IndexError):
                    pass

            if chosen_pos is None:
                available = [p for p in all_positions if p not in used_positions]
                if not available:
                    continue
                if used_positions:
                    chosen_pos = max(
                        available,
                        key=lambda p: min(abs(p[0] - q[0]) + abs(p[1] - q[1]) for q in used_positions),
                    )
                else:
                    chosen_pos = self.rng.choice(available)

            r, c = chosen_pos
            used_positions.add((r, c))

            stats_raw = cc.get("stats", {}) or {}
            stats: Dict[str, float] = {}
            for stat in STAT_NAMES:
                try:
                    stats[stat] = max(0.0, min(100.0, float(stats_raw.get(stat, self.rng.uniform(20, 80)))))
                except (TypeError, ValueError):
                    stats[stat] = round(self.rng.uniform(20, 80), 1)

            civ = Civilization(
                id=i,
                name=str(cc.get("name", CIV_NAMES[i % len(CIV_NAMES)])),
                color=str(cc.get("color", CIV_COLORS[i % len(CIV_COLORS)])),
                position=(r, c),
                stats=stats,
                territory=[(r, c)],
            )
            self.grid[r][c].owner_id = i
            self.civs.append(civ)

        self._log("Simulation initialised")

    def step(self) -> dict:
        if self.paused or self.game_state == "ended":
            return self._build_state()

        self.step_number += 1

        prev_territory: Dict[int, int] = {c.id: len(c.territory) for c in self.civs if c.alive}

        for civ in list(self.civs):
            if not civ.alive:
                continue

            passive_income = civ._get_passive_income()
            if passive_income > 0:
                civ.resources += passive_income

            research_rate = max(0.5, civ.stats.get("economy", 50) * 0.08)
            civ.add_research_points(research_rate)

            action = civ.select_action(self.rng)
            if action == "explore":
                self._do_explore(civ)
            elif action == "gather":
                self._do_gather(civ)
            elif action == "attack":
                self._do_attack(civ)
            elif action == "fortify":
                self._do_fortify(civ)
            elif action == "expand":
                self._do_expand(civ)

        self._check_milestones(prev_territory)
        self._check_dominance()

        return self._build_state()

    def step_once(self) -> dict:
        was_paused = self.paused
        self.paused = False
        state = self.step()
        self.paused = was_paused
        return state

    def _do_explore(self, civ: Civilization) -> None:
        frontier = self._frontier(civ)
        if not frontier:
            civ.apply_tradeoff("explore", False)
            return
        r, c = self.rng.choice(frontier)
        if self.grid[r][c].owner_id in (None, civ.id):
            civ.position = (r, c)
            self._log(f"⚑ {civ.name} explores ({r},{c})")
            civ.apply_tradeoff("explore", True)
        else:
            civ.apply_tradeoff("explore", False)

    def _do_gather(self, civ: Civilization) -> None:
        gathered = sum(
            self.rng.randint(1, 4)
            for r, c in civ.territory
            if self.grid[r][c].resource
        )
        if gathered:
            civ.resources += gathered
            self._log(f"💰 {civ.name} gathered {gathered} resources")
            civ.apply_tradeoff("gather", True)
        else:
            civ.apply_tradeoff("gather", False)

    def _do_attack(self, civ: Civilization) -> None:
        frontier = self._frontier(civ)
        enemy_tiles = [
            (r, c) for r, c in frontier
            if self.grid[r][c].owner_id is not None
            and self.grid[r][c].owner_id != civ.id
        ]
        if not enemy_tiles:
            civ.apply_tradeoff("attack", False)
            return

        r, c = self.rng.choice(enemy_tiles)
        enemy_id = self.grid[r][c].owner_id
        enemy = next((e for e in self.civs if e.id == enemy_id), None)
        if not enemy or not enemy.alive:
            civ.apply_tradeoff("attack", False)
            return

        atk = civ.stats["aggression"] + self.rng.uniform(-15, 15)
        dfn = enemy.stats["defense"] + self.rng.uniform(-15, 15)

        if atk > dfn:
            self.grid[r][c].owner_id = civ.id
            if (r, c) in enemy.territory:
                enemy.territory.remove((r, c))
            civ.territory.append((r, c))
            civ.position = (r, c)
            self._log(f"⚔️  {civ.name} conquered a tile from {enemy.name}")
            civ.apply_tradeoff("attack", True)
            enemy.apply_tradeoff("fortify", False)
            if not enemy.territory:
                enemy.alive = False
                self._milestone(f"💀 {enemy.name} was eliminated by {civ.name}!")
        else:
            self._log(f"🛡  {enemy.name} repelled {civ.name}'s attack")
            civ.apply_tradeoff("attack", False)
            enemy.apply_tradeoff("fortify", True)

    def _do_fortify(self, civ: Civilization) -> None:
        self._log(f"🏰 {civ.name} fortifies its borders")
        civ.apply_tradeoff("fortify", True)

    def _do_expand(self, civ: Civilization) -> None:
        frontier = self._frontier(civ)
        unclaimed = [(r, c) for r, c in frontier if self.grid[r][c].owner_id is None]
        if not unclaimed:
            civ.apply_tradeoff("expand", False)
            return
        r, c = self.rng.choice(unclaimed)
        self.grid[r][c].owner_id = civ.id
        civ.territory.append((r, c))
        civ.position = (r, c)
        self._log(f"🌍 {civ.name} expands territory")
        civ.apply_tradeoff("expand", True)

    def _check_milestones(self, prev_territory: Dict[int, int]) -> None:
        total_tiles = self.grid_size * self.grid_size
        for civ in self.civs:
            if not civ.alive:
                continue
            pct = len(civ.territory) / total_tiles
            prev_pct = prev_territory.get(civ.id, 0) / total_tiles
            for threshold in (0.20, 0.33, 0.50):
                if prev_pct < threshold <= pct:
                    label = f"{int(threshold * 100)}%"
                    self._milestone(f"🏆 {civ.name} controls {label} of the map!")

    def _check_dominance(self) -> None:
        if self.game_state == "ended":
            return
        total_tiles = self.grid_size * self.grid_size
        alive = [c for c in self.civs if c.alive]
        for civ in alive:
            if len(civ.territory) / total_tiles >= DOMINANCE_THRESHOLD:
                self.game_state = "ended"
                self.winner_id = civ.id
                self.winner_name = civ.name
                self._milestone(f"👑 {civ.name} has achieved DOMINANCE — simulation over!")
                return
        if len(alive) <= 1:
            self.game_state = "ended"
            if alive:
                self.winner_id = alive[0].id
                self.winner_name = alive[0].name
                self._milestone(f"👑 {alive[0].name} is the last civilization standing!")
        if self.step_number >= MAX_STEPS and self.game_state != "ended":
            self.game_state = "ended"
            top = max(self.civs, key=lambda c: len(c.territory))
            self.winner_id = top.id
            self.winner_name = top.name
            self._milestone(f"⏱ Time limit reached — {top.name} wins by territory count!")

    def apply_command(self, cmd: dict) -> str:
        command = cmd.get("cmd", "")

        if command == "pause":
            self.paused = True
            return "Simulation paused"

        elif command == "resume":
            self.paused = False
            return "Simulation resumed"

        elif command == "step_once":
            self.step_once()
            return f"Stepped to #{self.step_number}"

        elif command == "set_speed":
            try:
                speed = max(0.1, min(8.0, float(cmd.get("speed", 1.0))))
            except (TypeError, ValueError):
                return "Invalid speed value"
            self.tick_interval = round(0.6 / speed, 3)
            return f"Speed set to {speed}× (tick every {self.tick_interval}s)"

        elif command in ("reset_all", "start"):
            config = cmd.get("config", {})
            self._reset(config or {})
            return "Simulation reset"

        elif command == "nudge_stat":
            civ_id = cmd.get("civ_id")
            stat = cmd.get("stat")
            try:
                delta = float(cmd.get("delta", 0))
            except (TypeError, ValueError):
                return "Invalid delta value"
            civ = next((c for c in self.civs if c.id == civ_id), None)
            if civ and stat in civ.stats:
                civ.stats[stat] = max(0.0, min(100.0, civ.stats[stat] + delta))
                return f"Nudged {civ.name}'s {stat} by {delta:+.0f}"
            return "Civ or stat not found"

        elif command == "spawn_civ":
            all_pos = [(r, c) for r in range(self.grid_size) for c in range(self.grid_size)]
            occupied: Set[Tuple[int, int]] = {p for civ in self.civs for p in civ.territory}
            available = [p for p in all_pos if p not in occupied]
            if not available:
                return "No space to spawn a new civilisation"

            pos_raw = cmd.get("position")
            chosen_pos: Optional[Tuple[int, int]] = None
            if pos_raw is not None:
                try:
                    r2, c2 = int(pos_raw[0]), int(pos_raw[1])
                    if (r2, c2) in available:
                        chosen_pos = (r2, c2)
                except (TypeError, ValueError, IndexError):
                    pass
            if chosen_pos is None:
                chosen_pos = self.rng.choice(available)

            r, c = chosen_pos
            new_id = max((civ.id for civ in self.civs), default=-1) + 1

            stats_raw = cmd.get("stats", {}) or {}
            stats: Dict[str, float] = {}
            for stat in STAT_NAMES:
                try:
                    stats[stat] = max(0.0, min(100.0, float(stats_raw.get(stat, self.rng.uniform(20, 80)))))
                except (TypeError, ValueError):
                    stats[stat] = round(self.rng.uniform(20, 80), 1)

            name = str(cmd.get("name", CIV_NAMES[new_id % len(CIV_NAMES)]))
            color = str(cmd.get("color", CIV_COLORS[new_id % len(CIV_COLORS)]))

            new_civ = Civilization(
                id=new_id,
                name=name,
                color=color,
                position=(r, c),
                stats=stats,
                territory=[(r, c)],
            )
            self.grid[r][c].owner_id = new_id
            self.civs.append(new_civ)
            self._log(f"✨ {name} has entered the simulation!")
            return f"Spawned {name}"

        elif command == "reset_civ":
            civ_id = cmd.get("civ_id")
            civ = next((c for c in self.civs if c.id == civ_id), None)
            if civ:
                civ.stats = {stat: round(self.rng.uniform(20, 80), 1) for stat in STAT_NAMES}
                civ.stat_history = []
                civ.reward_log = []
                civ.last_action = ""
                civ.action_probs = {}
                civ.action_details = {}
                civ.last_decision_trace = ""
                civ.techs = {t: "locked" for t in civ.techs}
                civ.research_points = 0.0
                civ.researching = None
                return f"Reset {civ.name}'s stats to random values"
            return "Civ not found"

        return f"Unknown command: {command}"

    def _global_stats(self) -> dict:
        alive = [c for c in self.civs if c.alive]
        territory_lb = sorted(
            [{"id": c.id, "name": c.name, "color": c.color, "territory": len(c.territory)} for c in self.civs],
            key=lambda x: x["territory"],
            reverse=True,
        )
        resource_lb = sorted(
            [{"id": c.id, "name": c.name, "color": c.color, "resources": c.resources} for c in self.civs],
            key=lambda x: x["resources"],
            reverse=True,
        )
        stat_trends: Dict[str, float] = {}
        for stat in STAT_NAMES:
            recent = [h.get(stat, 0) for c in alive for h in (c.stat_history[-5:] if c.stat_history else [])]
            older = [h.get(stat, 0) for c in alive for h in (c.stat_history[-10:-5] if len(c.stat_history) > 5 else [])]
            trend = (sum(recent) / len(recent) - sum(older) / len(older)) if recent and older else 0.0
            stat_trends[stat] = round(trend, 2)

        return {
            "total_events": self.total_events,
            "territory_leaderboard": territory_lb,
            "resource_leaderboard": resource_lb,
            "stat_trends": stat_trends,
        }

    def _build_state(self) -> dict:
        return {
            "civs": [c.to_dict() for c in self.civs],
            "map_state": [tile.to_dict() for row in self.grid for tile in row],
            "step_number": self.step_number,
            "event_log": self.event_log[-30:],
            "milestone_log": self.milestone_log[-5:],
            "paused": self.paused,
            "game_state": self.game_state,
            "winner_id": self.winner_id,
            "winner_name": self.winner_name,
            "grid_size": self.grid_size,
            "tick_interval": self.tick_interval,
            "global_stats": self._global_stats(),
        }
