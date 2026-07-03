export interface SimState {
  civs: Civilization[];
  map_state: Tile[];
  step_number: number;
  event_log: string[];
  milestone_log: string[];
  paused: boolean;
  game_state: 'running' | 'ended';
  winner_id: number | null;
  winner_name: string | null;
  grid_size: number;
  tick_interval: number;
  global_stats: GlobalStats;
  command_result?: string;
}

export interface ActionBreakdownItem {
  stat: string;
  value: number;
  coefficient: number;
}

export interface ActionDetail {
  weight: number;
  breakdown: ActionBreakdownItem[];
  tech_bonus: number;
  score: number;
  chosen: boolean;
}

export interface Civilization {
  id: number;
  name: string;
  color: string;
  position: [number, number];
  stats: { aggression: number; defense: number; economy: number; exploration: number };
  territory_count: number;
  resources: number;
  alive: boolean;
  stat_history: StatSnapshot[];
  last_action: string;
  action_probs: Record<string, number>;
  action_details: Record<string, ActionDetail>;
  last_decision_trace: string;
  reward_log: RewardEntry[];
  techs: Record<string, string>;
  research_points: number;
  researching: string | null;
}

export interface StatSnapshot {
  aggression: number;
  defense: number;
  economy: number;
  exploration: number;
}

export interface RewardEntry {
  msg: string;
  type: 'reward' | 'antireward';
}

export interface Tile {
  row: number;
  col: number;
  owner_id: number | null;
  resource: number;
}

export interface GlobalStats {
  total_events: number;
  territory_leaderboard: Array<{ id: number; name: string; color: string; territory: number }>;
  resource_leaderboard: Array<{ id: number; name: string; color: string; resources: number }>;
  stat_trends: Record<string, number>;
}

export interface CivConfig {
  name: string;
  color: string;
  stats: { aggression: number; defense: number; economy: number; exploration: number };
  position?: [number, number] | null;
}

export interface SimConfig {
  map_size: 'small' | 'medium' | 'large';
  resource_density: number;
  civs: CivConfig[];
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export const SWATCH_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export const STAT_COLORS: Record<string, string> = {
  aggression: '#ef4444',
  defense: '#3b82f6',
  economy: '#22c55e',
  exploration: '#f97316',
};

export const ACTION_COLORS: Record<string, string> = {
  explore: '#22c55e',
  gather: '#f59e0b',
  attack: '#ef4444',
  fortify: '#3b82f6',
  expand: '#8b5cf6',
};

export const ACTION_ICONS: Record<string, string> = {
  explore: '⚑',
  gather: '💰',
  attack: '⚔',
  fortify: '🏰',
  expand: '🌍',
};

export const FANTASY_ADJECTIVES = [
  'Iron', 'Storm', 'Golden', 'Dark', 'Silver', 'Pale', 'Ashen', 'Ember',
  'Frost', 'Crimson', 'Azure', 'Hollow', 'Stone', 'Titan', 'Savage',
  'Ancient', 'Cursed', 'Dire', 'Grim', 'Blessed', 'Verdant', 'Obsidian',
];

export const FANTASY_NOUNS = [
  'Reach', 'Vale', 'Crest', 'Drift', 'Hold', 'Run', 'Forge', 'Peak',
  'Keep', 'Watch', 'Gate', 'Ridge', 'Shore', 'Throne', 'Spire',
  'Bastion', 'Haven', 'Maw', 'Falls', 'Hollow', 'Mark', 'Court',
];

export function randomFantasyName(): string {
  const adj = FANTASY_ADJECTIVES[Math.floor(Math.random() * FANTASY_ADJECTIVES.length)];
  const noun = FANTASY_NOUNS[Math.floor(Math.random() * FANTASY_NOUNS.length)];
  return `${adj} ${noun}`;
}

export function defaultCivStats() {
  return { aggression: 50, defense: 50, economy: 50, exploration: 50 };
}

export function randomCivStats() {
  return {
    aggression: Math.round(20 + Math.random() * 60),
    defense: Math.round(20 + Math.random() * 60),
    economy: Math.round(20 + Math.random() * 60),
    exploration: Math.round(20 + Math.random() * 60),
  };
}

export const TECH_TREE_DEFINITION: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  cost: number;
}>> = {
  aggression: [
    { id: "bronze_weapons", name: "Bronze Weapons", description: "Attack weight +20%", cost: 30 },
    { id: "siege_tactics", name: "Siege Tactics", description: "Attack weight +30%, conquest bonus", cost: 60 },
    { id: "warlord_doctrine", name: "Warlord Doctrine", description: "Attack economy penalty reduced by half", cost: 100 },
  ],
  defense: [
    { id: "walls", name: "Walls", description: "Fortify weight +20%", cost: 30 },
    { id: "scouting_network", name: "Scouting Network", description: "Fortify weight +30%", cost: 60 },
    { id: "fortress_culture", name: "Fortress Culture", description: "Fortifying gives small Economy boost", cost: 100 },
  ],
  economy: [
    { id: "trade_routes", name: "Trade Routes", description: "Passive +1 resource per turn", cost: 30 },
    { id: "banking", name: "Banking", description: "Passive +2 resources per turn, gather weight +20%", cost: 60 },
    { id: "golden_age", name: "Golden Age", description: "All gather yields doubled", cost: 100 },
  ],
  exploration: [
    { id: "cartography", name: "Cartography", description: "Explore weight +20%", cost: 30 },
    { id: "pioneer_spirit", name: "Pioneer Spirit", description: "Explore weight +30%", cost: 60 },
    { id: "diaspora", name: "Diaspora", description: "Expand weight +40%", cost: 100 },
  ],
};

export const TECH_BRANCH_COLORS: Record<string, string> = {
  aggression: STAT_COLORS.aggression,
  defense: STAT_COLORS.defense,
  economy: STAT_COLORS.economy,
  exploration: STAT_COLORS.exploration,
};
