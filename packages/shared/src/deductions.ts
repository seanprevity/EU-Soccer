// Final, upheld points deductions for past seasons.
// season = starting year, as stored in standings ("2009" = 2009-10)
export type PointDeduction = {
  league: string;
  season: string;
  team: string; // must match teams.team_name exactly
  points: number;
  placedLast?: boolean;
  reason: string;
};

export const POINT_DEDUCTIONS: PointDeduction[] = [
  // Premier League
  {
    league: "Premier League",
    season: "2009",
    team: "Portsmouth",
    points: 9,
    reason: "Entered financial administration",
  },
  {
    league: "Premier League",
    season: "2023",
    team: "Everton",
    points: 8,
    reason: "Two breaches of profit and sustainability rules (6 + 2 points)",
  },
  {
    league: "Premier League",
    season: "2023",
    team: "Nott'm Forest",
    points: 4,
    reason: "Breach of profit and sustainability rules",
  },

  // Serie A
  {
    league: "Serie A",
    season: "2005",
    team: "Milan",
    points: 30,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2005",
    team: "Fiorentina",
    points: 30,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2005",
    team: "Lazio",
    points: 30,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2005",
    team: "Juventus",
    points: 0,
    placedLast: true,
    reason: "Calciopoli: title revoked and relegated",
  },
  {
    league: "Serie A",
    season: "2006",
    team: "Fiorentina",
    points: 15,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2006",
    team: "Reggina",
    points: 11,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2006",
    team: "Milan",
    points: 8,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2006",
    team: "Lazio",
    points: 3,
    reason: "Calciopoli match-fixing scandal",
  },
  {
    league: "Serie A",
    season: "2006",
    team: "Siena",
    points: 1,
    reason: "Administrative irregularities",
  },
  {
    league: "Serie A",
    season: "2010",
    team: "Bologna",
    points: 3,
    reason: "Financial irregularities",
  },
  {
    league: "Serie A",
    season: "2011",
    team: "Atalanta",
    points: 6,
    reason: "Betting scandal",
  },
  {
    league: "Serie A",
    season: "2012",
    team: "Siena",
    points: 6,
    reason: "Betting scandal",
  },
  {
    league: "Serie A",
    season: "2012",
    team: "Atalanta",
    points: 2,
    reason: "Betting scandal",
  },
  {
    league: "Serie A",
    season: "2012",
    team: "Torino",
    points: 1,
    reason: "Betting scandal",
  },
  {
    league: "Serie A",
    season: "2012",
    team: "Sampdoria",
    points: 1,
    reason: "Betting scandal",
  },
  {
    league: "Serie A",
    season: "2014",
    team: "Parma",
    points: 7,
    reason: "Unpaid wages and financial irregularities",
  },
  {
    league: "Serie A",
    season: "2018",
    team: "Chievo",
    points: 3,
    reason: "False accounting",
  },
  {
    league: "Serie A",
    season: "2022",
    team: "Juventus",
    points: 10,
    reason: "False accounting on player transfers",
  },

  // Ligue 1
  {
    league: "Ligue 1",
    season: "2021",
    team: "Nice",
    points: 1,
    reason: "Crowd trouble (match against Marseille abandoned)",
  },
  {
    league: "Ligue 1",
    season: "2021",
    team: "Lyon",
    points: 1,
    reason: "Crowd trouble (match against Marseille abandoned)",
  },
  {
    league: "Ligue 1",
    season: "2023",
    team: "Montpellier",
    points: 1,
    reason: "Crowd trouble (match against Clermont abandoned)",
  },
];
