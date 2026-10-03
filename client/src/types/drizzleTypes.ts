export interface players {
  name: string;
  imageUrl: string | null;
}

export interface leagues {
  name: string;
  country: string;
}

export interface teams {
  id: number;
  teamName: string;
}

export interface Standings {
  league: string;
  name: string;
  season: string;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsAgainst: number;
  goalsFor: number;
  goalDifference: number;
  points: number;
  form: string | null;
  recentGf: number | null;
  recentGa: number | null;
  type: string;
}

export type ExpectedStanding = {
  team: string;
  expectedPosition: number | null;
  seasons: number;
};

export interface upcomingMatches {
  id: number;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

export type TopPlayerCategory =
  | "goals"
  | "assists"
  | "saves"
  | "yellow_cards"
  | "red_cards";

export interface topPlayers {
  player: string;
  team: string;
  value: number;
  appearances: number | null;
  imageUrl: string | null;
}

export type MatchEvent = {
  minute: number | null;
  extraMinute: number | null;
  side: "home" | "away" | null;
  player: string | null; // for subs: the player coming on
  playerOut?: string | null; // subs only
  assist: string | null;
  kind:
    | "goal"
    | "penalty"
    | "own_goal"
    | "yellow"
    | "red"
    | "second_yellow"
    | "sub";
};

export type LineupPlayer = {
  espnId: string;
  name: string;
  shortName: string | null;
  jersey: string | null;
  position: string | null;
  positionName: string | null;
  formationPlace: number | null; // 1 = keeper; null = bench
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  headshot: string | null;
};

export type TeamLineup = { formation: string | null; players: LineupPlayer[] };
export type MatchLineups = { home: TeamLineup; away: TeamLineup };

export interface matchStats {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string | null;
  ftr: string | null;
  hs: number | null;
  as: number | null;
  hst: number | null;
  ast: number | null;
  hc: number | null;
  ac: number | null;
  fthg: number | null;
  ftag: number | null;
  hy: number | null;
  ay: number | null;
  hr: number | null;
  ar: number | null;
  hf: number | null;
  af: number | null;
  league: string;
  hxg: number | null;
  axg: number | null;
  espnId: string | null;
  events: MatchEvent[] | null;
  hposs: number | null;
  aposs: number | null;
  lineups: MatchLineups | null;
  hbs: number | null;
  abs: number | null;
  hsv: number | null;
  asv: number | null;
}

export type matchPreview = {
  id: number;
  espnId: string | null;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string | null;
  ftr: string | null;
  fthg: number | null;
  ftag: number | null;
  hr: number | null;
  ar: number | null;
};

export interface head2Head {
  team1: string;
  team2: string;
  mp: number | null;
  team1Wins: number | null;
  team2Wins: number | null;
  draws: number | null;
  last5: number[];
}

export interface odds {
  bookmaker: string;
  marketType: string;
  oddsHome: string | null;
  oddsDraw: string | null;
  oddsAway: string | null;
  updatedAt: string | null;
  match: upcomingMatches | null;
}

export interface teamStats {
  name: string;
  won: number;
  draw: number;
  lost: number;
  xg: number;
  gf: number;
  ga: number;
  gd: number;
  shots: number;
  shotsOnTarget: number;
  form: string;
  played: number;
  corners: number;
  yellows: number;
  reds: number;
  goalEvents: JSON;
}

export interface SquadPlayer {
  id: number;
  player: string;
  position: string | null;
  number: number | null;
  team: string | null;
  league: string | null;
  espnId: string | null;
  nationality: string | null;
  nationalityCode: string | null;
  flagUrl: string | null;
  dateOfBirth: string | null;
  heightIn: number | null;
  weightLbs: number | null;
  statsSeason: string | null;
  appearances: number | null;
  subIns: number | null;
  goals: number | null;
  assists: number | null;
  ownGoals: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  yellowCards: number | null;
  redCards: number | null;
  foulsCommitted: number | null;
  foulsSuffered: number | null;
  offsides: number | null;
  saves: number | null;
  goalsConceded: number | null;
  updatedAt: string | null;
  imageUrl: string | null; // obtained from players table in squad query
}

export interface simulation {
  home_team: string;
  away_team: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  avg_goals_home: number;
  avg_goals_away: number;
  lambda_home: number;
  lambda_away: number;
  most_likely_score: string;
  most_likely_score_prob: number;
}
