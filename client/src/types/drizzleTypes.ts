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

export interface upcomingMatches {
  id: number;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

export interface goalScorers {
  player: string;
  goals: number;
  season: string;
  team: string;
  league: string | null;
  imageUrl: string | null;
}

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
}

export type MatchBase = {
  id: number | string;
  league: string;
  matchDate: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
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
}

export interface squad {
  player: string | null;
  position: string | null;
  number: number | null;
  team: string | null;
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
