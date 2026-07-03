from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

STAT_NAMES = ["aggression", "defense", "economy", "exploration"]

ACTIONS = ["explore", "gather", "attack", "fortify", "expand"]

STAT_COLORS: Dict[str, str] = {
    "aggression": "#ef4444",
    "defense": "#3b82f6",
    "economy": "#22c55e",
    "exploration": "#f97316",
}

TECH_TREE: Dict[str, list] = {
    "aggression": [
        {
            "id": "bronze_weapons",
            "name": "Bronze Weapons",
            "description": "Attack weight +20%",
            "cost": 30,
            "effect": {"type": "multiplier", "action": "attack", "value": 1.20},
        },
        {
            "id": "siege_tactics",
            "name": "Siege Tactics",
            "description": "Attack weight +30%, conquest bonus",
            "cost": 60,
            "effect": {"type": "multiplier", "action": "attack", "value": 1.30},
        },
        {
            "id": "warlord_doctrine",
            "name": "Warlord Doctrine",
            "description": "Attack economy penalty reduced by half",
            "cost": 100,
            "effect": {"type": "tradeoff_reduction", "action": "attack", "stat": "economy", "value": 0.5},
        },
    ],
    "defense": [
        {
            "id": "walls",
            "name": "Walls",
            "description": "Fortify weight +20%",
            "cost": 30,
            "effect": {"type": "multiplier", "action": "fortify", "value": 1.20},
        },
        {
            "id": "scouting_network",
            "name": "Scouting Network",
            "description": "Fortify weight +30%",
            "cost": 60,
            "effect": {"type": "multiplier", "action": "fortify", "value": 1.30},
        },
        {
            "id": "fortress_culture",
            "name": "Fortress Culture",
            "description": "Fortifying gives small Economy boost",
            "cost": 100,
            "effect": {"type": "tradeoff_bonus", "action": "fortify", "stat": "economy", "value": 2.0},
        },
    ],
    "economy": [
        {
            "id": "trade_routes",
            "name": "Trade Routes",
            "description": "Passive +1 resource per turn",
            "cost": 30,
            "effect": {"type": "passive_income", "value": 1},
        },
        {
            "id": "banking",
            "name": "Banking",
            "description": "Passive +2 resources per turn, gather weight +20%",
            "cost": 60,
            "effect": {"type": "passive_income", "value": 2},
        },
        {
            "id": "golden_age",
            "name": "Golden Age",
            "description": "All gather yields doubled",
            "cost": 100,
            "effect": {"type": "multiplier", "action": "gather", "value": 2.0},
        },
    ],
    "exploration": [
        {
            "id": "cartography",
            "name": "Cartography",
            "description": "Explore weight +20%",
            "cost": 30,
            "effect": {"type": "multiplier", "action": "explore", "value": 1.20},
        },
        {
            "id": "pioneer_spirit",
            "name": "Pioneer Spirit",
            "description": "Explore weight +30%, explore defense penalty reduced",
            "cost": 60,
            "effect": {"type": "multiplier", "action": "explore", "value": 1.30},
        },
        {
            "id": "diaspora",
            "name": "Diaspora",
            "description": "Expand weight +40%",
            "cost": 100,
            "effect": {"type": "multiplier", "action": "expand", "value": 1.40},
        },
    ],
}

ALL_TECH_IDS: List[str] = [tech["id"] for branch in TECH_TREE.values() for tech in branch]


@dataclass
class Civilization:
    id: int
    name: str
    color: str
    position: Tuple[int, int]
    stats: Dict[str, float]
    territory: List[Tuple[int, int]] = field(default_factory=list)
    resources: int = 0
    alive: bool = True
    stat_history: List[Dict[str, float]] = field(default_factory=list)
    last_action: str = ""
    action_probs: Dict[str, float] = field(default_factory=dict)
    action_details: Dict[str, dict] = field(default_factory=dict)
    last_decision_trace: str = ""
    reward_log: List[Dict[str, str]] = field(default_factory=list)
    techs: Dict[str, str] = field(default_factory=lambda: {t: "locked" for t in ALL_TECH_IDS})
    research_points: float = 0.0
    researching: Optional[str] = None

    def _get_tech_multiplier(self, action: str) -> float:
        m = 1.0
        for branch in TECH_TREE.values():
            for tech in branch:
                if self.techs.get(tech["id"]) == "unlocked" and tech["effect"].get("action") == action:
                    if tech["effect"]["type"] == "multiplier":
                        m *= tech["effect"]["value"]
        return m

    def _get_tradeoff_reduction(self, action: str, stat: str) -> float:
        for branch in TECH_TREE.values():
            for tech in branch:
                if (
                    self.techs.get(tech["id"]) == "unlocked"
                    and tech["effect"].get("type") == "tradeoff_reduction"
                    and tech["effect"].get("action") == action
                    and tech["effect"].get("stat") == stat
                ):
                    return tech["effect"]["value"]
        return 1.0

    def _get_tradeoff_bonus(self, action: str, stat: str) -> float:
        for branch in TECH_TREE.values():
            for tech in branch:
                if (
                    self.techs.get(tech["id"]) == "unlocked"
                    and tech["effect"].get("type") == "tradeoff_bonus"
                    and tech["effect"].get("action") == action
                    and tech["effect"].get("stat") == stat
                ):
                    return tech["effect"]["value"]
        return 0.0

    def _get_passive_income(self) -> int:
        return sum(
            tech["effect"]["value"]
            for branch in TECH_TREE.values()
            for tech in branch
            if self.techs.get(tech["id"]) == "unlocked" and tech["effect"]["type"] == "passive_income"
        )

    def select_action(self, rng: random.Random) -> str:
        base_weights = {
            "explore": self.stats["exploration"],
            "gather": self.stats["economy"],
            "attack": self.stats["aggression"],
            "fortify": self.stats["defense"],
            "expand": (self.stats["exploration"] + self.stats["economy"]) / 2.0,
        }

        action_weights = {
            a: w * self._get_tech_multiplier(a) for a, w in base_weights.items()
        }

        tech_bonuses = {a: self._get_tech_multiplier(a) for a in ACTIONS}

        breakdowns: Dict[str, list] = {
            "explore": [{"stat": "exploration", "value": round(self.stats["exploration"], 1), "coefficient": round(tech_bonuses["explore"], 3)}],
            "gather": [{"stat": "economy", "value": round(self.stats["economy"], 1), "coefficient": round(tech_bonuses["gather"], 3)}],
            "attack": [{"stat": "aggression", "value": round(self.stats["aggression"], 1), "coefficient": round(tech_bonuses["attack"], 3)}],
            "fortify": [{"stat": "defense", "value": round(self.stats["defense"], 1), "coefficient": round(tech_bonuses["fortify"], 3)}],
            "expand": [
                {"stat": "exploration", "value": round(self.stats["exploration"], 1), "coefficient": round(0.5 * tech_bonuses["expand"], 3)},
                {"stat": "economy", "value": round(self.stats["economy"], 1), "coefficient": round(0.5 * tech_bonuses["expand"], 3)},
            ],
        }

        weights = [action_weights[a] for a in ACTIONS]
        temperature = 20.0
        exp_w = [math.exp(w / temperature) for w in weights]
        total = sum(exp_w)
        probs = [w / total for w in exp_w]

        chosen = rng.choices(ACTIONS, weights=probs)[0]

        self.action_probs = {a: round(p * 100, 1) for a, p in zip(ACTIONS, probs)}

        self.action_details = {
            a: {
                "weight": round(action_weights[a], 2),
                "breakdown": breakdowns[a],
                "tech_bonus": round(tech_bonuses[a], 3),
                "score": round(exp_w[i] / total * 100, 2) if total > 0 else 0,
                "chosen": a == chosen,
            }
            for i, a in enumerate(ACTIONS)
        }

        self.last_action = chosen

        chosen_detail = self.action_details[chosen]
        trace_parts = []
        for item in chosen_detail["breakdown"]:
            contrib = item["value"] * item["coefficient"]
            trace_parts.append(f"{item['stat']}({item['value']})×{item['coefficient']}={contrib:.1f}")
        trace_math = " + ".join(trace_parts)
        self.last_decision_trace = (
            f"Chose {chosen.upper()} — weight {chosen_detail['weight']} "
            f"({trace_math})"
        )

        return chosen

    def add_research_points(self, amount: float) -> None:
        self.research_points += amount
        if self.researching is None:
            self._pick_next_research()
        if self.researching:
            tech_def = self._find_tech(self.researching)
            if tech_def and self.research_points >= tech_def["cost"]:
                self.research_points -= tech_def["cost"]
                self.techs[self.researching] = "unlocked"
                self.researching = None
                self._pick_next_research()

    def _pick_next_research(self) -> None:
        dominant_stat = max(STAT_NAMES, key=lambda s: self.stats.get(s, 0))
        branch = TECH_TREE.get(dominant_stat, TECH_TREE["economy"])
        for tech in branch:
            if self.techs.get(tech["id"]) == "locked":
                if self._are_prereqs_unlocked(tech["id"], dominant_stat):
                    self.techs[tech["id"]] = "in_progress"
                    self.researching = tech["id"]
                    return
        for branch in TECH_TREE.values():
            for tech in branch:
                if self.techs.get(tech["id"]) == "locked":
                    self.techs[tech["id"]] = "in_progress"
                    self.researching = tech["id"]
                    return

    def _are_prereqs_unlocked(self, tech_id: str, branch_name: str) -> bool:
        branch = TECH_TREE.get(branch_name, [])
        found = False
        for tech in branch:
            if tech["id"] == tech_id:
                found = True
                break
            if self.techs.get(tech["id"]) != "unlocked":
                return False
        return found

    @staticmethod
    def _find_tech(tech_id: str) -> Optional[dict]:
        for branch in TECH_TREE.values():
            for tech in branch:
                if tech["id"] == tech_id:
                    return tech
        return None

    def apply_tradeoff(self, action: str, success: bool, magnitude: float = 5.0) -> None:
        x = magnitude
        s = self.stats
        reward_entry: Optional[Dict[str, str]] = None

        if action == "explore" and success:
            tradeoff_reduction = self._get_tradeoff_reduction("explore", "defense")
            s["exploration"] = min(100.0, s["exploration"] + x)
            s["defense"] = max(0.0, s["defense"] - x / 2 * tradeoff_reduction)
            reward_entry = {"msg": "+Exploration (found new territory) / -Defense (spread thin)", "type": "reward"}
        elif action == "attack" and success:
            tradeoff_reduction = self._get_tradeoff_reduction("attack", "economy")
            s["aggression"] = min(100.0, s["aggression"] + x)
            s["economy"] = max(0.0, s["economy"] - x / 2 * tradeoff_reduction)
            reward_entry = {"msg": "+Aggression (conquered tile) / -Economy (war cost)", "type": "reward"}
        elif action == "fortify" and success:
            s["defense"] = min(100.0, s["defense"] + x)
            s["exploration"] = max(0.0, s["exploration"] - x / 2)
            econ_bonus = self._get_tradeoff_bonus("fortify", "economy")
            if econ_bonus > 0:
                s["economy"] = min(100.0, s["economy"] + econ_bonus)
            reward_entry = {"msg": "+Defense (fortified borders) / -Exploration (stayed put)", "type": "reward"}
        elif action == "gather" and success:
            s["economy"] = min(100.0, s["economy"] + x)
            s["aggression"] = max(0.0, s["aggression"] - x / 2)
            reward_entry = {"msg": "+Economy (gathered resources) / -Aggression (peaceful focus)", "type": "reward"}
        elif action == "expand" and success:
            s["exploration"] = min(100.0, s["exploration"] + x / 2)
            s["economy"] = min(100.0, s["economy"] + x / 2)
            reward_entry = {"msg": "+Exploration/+Economy (expanded territory peacefully)", "type": "reward"}
        elif not success:
            reward_entry = {
                "msg": f"-{action.capitalize()} failed — no meaningful outcome",
                "type": "antireward",
            }

        self.stat_history.append({k: round(v, 1) for k, v in s.items()})
        if len(self.stat_history) > 60:
            self.stat_history = self.stat_history[-60:]

        if reward_entry:
            self.reward_log.append(reward_entry)
            if len(self.reward_log) > 50:
                self.reward_log = self.reward_log[-50:]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "position": list(self.position),
            "stats": {k: round(v, 1) for k, v in self.stats.items()},
            "territory_count": len(self.territory),
            "resources": self.resources,
            "alive": self.alive,
            "stat_history": self.stat_history[-30:],
            "last_action": self.last_action,
            "action_probs": self.action_probs,
            "action_details": self.action_details,
            "last_decision_trace": self.last_decision_trace,
            "reward_log": self.reward_log[-20:],
            "techs": self.techs,
            "research_points": round(self.research_points, 1),
            "researching": self.researching,
        }
