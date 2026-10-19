// this normalizes team names from the upcoming matches API that calls football-data.org
export const upcoming_map = new Map<string, string>([
  ["Brighton Hove", "Brighton"],
  ["Nottingham", "Nott'm Forest"],
  ["Wolverhampton", "Wolves"],
  ["Bayern", "Bayern Munich"],
  ["Stuttgart", "VfB Stuttgart"],
  ["1. FC Köln", "FC Koln"],
  ["Frankfurt", "Eintracht Frankfurt"],
  ["Freiburg", "SC Freiburg"],
  ["HSV", "Hamburger SV"],
  ["St. Pauli", "St Pauli"],
  ["Bremen", "Werder Bremen"],
  ["Olympique Lyon", "Lyon"],
  ["RC Lens", "Lens"],
  ["Stade Rennais", "Rennes"],
  ["Angers SCO", "Angers"],
  ["FC Metz", "Metz"],
  ["Como 1907", "Como"],
  ["AC Pisa", "Pisa"],
  ["Barça", "Barcelona"],
  ["Atleti", "Atletico Madrid"],
  ["Sevilla FC", "Sevilla"],
  ["Athletic", "Athletic Club"],
  ["Alavés", "Alaves"],
  ["Celta", "Celta Vigo"],
  ["Real Oviedo", "Oviedo"],
  ["Leganés", "Leganes"],
  ["Sheffield Utd", "Sheffield United"],
  ["Cádiz CF", "Cadiz"],
  ["Almería", "Almeria"],
  ["Ipswich", "Ipswich Town"],
  ["Coventry City", "Coventry"],
  ["Hull City", "Hull"],
  ["SC Paderborn", "Paderborn"],
  ["Schalke", "Schalke 04"],
  ["Venezia FC", "Venezia"],
  ["Málaga", "Malaga"],
  ["Santander", "Racing Santander"],
  ["SV Elversberg", "Elversberg"],
]);

export const ESPN_MAP = new Map<string, string>([
  // ["ESPN team name", "your team name"],
  ["Hull City", "Hull"],
  ["Coventry City", "Coventry"],
  ["Brighton & Hove Albion", "Brighton"],
  ["Newcastle United", "Newcastle"],
  ["AFC Bournemouth", "Bournemouth"],
  ["Nottingham Forest", "Nott'm Forest"],
  ["Málaga", "Malaga"],
  ["Hamburg SV", "Hamburger SV"],
  ["1. FC Union Berlin", "Union Berlin"],
  ["SV Elversberg", "Elversberg"],
  ["FC Cologne", "FC Koln"],
  ["SC Paderborn 07", "Paderborn"],
  ["FC Augsburg", "Augsburg"],
  ["Borussia Mönchengladbach", "M'gladbach"],
  ["Paris Saint-Germain", "PSG"],
  ["AJ Auxerre", "Auxerre"],
  ["Le Havre AC", "Le Havre"],
  ["AS Monaco", "Monaco"],
  ["Stade Rennais", "Rennes"],
  ["Internazionale", "Inter"],
  ["Real Oviedo", "Oviedo"],
  ["St. Pauli", "St Pauli"],
  ["1. FC Heidenheim 1846", "Heidenheim"],
]);

// this normalizes the-odds-api team names
export const ODDS_MAP = new Map<string, string>([
  // Premier League
  ["Newcastle United", "Newcastle"],
  ["Tottenham Hotspur", "Tottenham"],
  ["Manchester United", "Man United"],
  ["Manchester City", "Man City"],
  ["Wolverhampton Wanderers", "Wolves"],
  ["Brighton and Hove Albion", "Brighton"],
  ["Nottingham Forest", "Nott'm Forest"],
  ["West Ham United", "West Ham"],
  ["Hull City", "Hull"],
  ["Coventry City", "Coventry"],
  // La Liga
  ["CA Osasuna", "Osasuna"],
  ["Atlético Madrid", "Atletico Madrid"],
  ["Alavés", "Alaves"],
  ["Athletic Bilbao", "Athletic Club"],
  ["Elche CF", "Elche"],
  ["Málaga", "Malaga"],
  ["Deportivo La Coruña", "Deportivo"],
  ["Real Racing Club de Santander", "Racing Santander"],
  // Ligue 1
  ["Paris Saint Germain", "PSG"],
  ["AS Monaco", "Monaco"],
  ["RC Lens", "Lens"],
  ["Le Mans FC", "Le Mans"],
  // Serie A
  ["AC Milan", "Milan"],
  ["AS Roma", "Roma"],
  ["Atalanta BC", "Atalanta"],
  ["Inter Milan", "Inter"],
  ["Hellas Verona", "Verona"],
  // Bundesliga
  ["FC St. Pauli", "St Pauli"],
  ["TSG Hoffenheim", "Hoffenheim"],
  ["1. FC Heidenheim", "Heidenheim"],
  ["FSV Mainz 05", "Mainz"],
  ["Borussia Monchengladbach", "M'gladbach"],
  ["1. FC Köln", "FC Koln"],
  ["Borussia Dortmund", "Dortmund"],
  ["VfL Wolfsburg", "Wolfsburg"],
  ["Bayer Leverkusen", "Leverkusen"],
  ["FC Schalke 04", "Schalke 04"],
  ["SC Paderborn", "Paderborn"],
]);

// normalizes the names of teams from the football-data.co.uk match stats csv files.
export const exception_teams = new Map<string, string>([
  // La Liga
  ["Ath Bilbao", "Athletic Club"],
  ["Sociedad", "Real Sociedad"],
  ["Celta", "Celta Vigo"],
  ["Betis", "Real Betis"],
  ["Vallecano", "Rayo Vallecano"],
  ["La Coruna", "Deportivo"],
  ["Ath Madrid", "Atletico Madrid"],
  ["Espanol", "Espanyol"],
  ["Santander", "Racing Santander"],
  // Bundesliga
  ["Stuttgart", "VfB Stuttgart"],
  ["Freiburg", "SC Freiburg"],
  ["Bochum", "VfL Bochum"],
  ["Ein Frankfurt", "Eintracht Frankfurt"],
  ["Hamburg", "Hamburger SV"],
  ["Braunschweig", "Eintracht Braunschweig"],
  // Serie A
  ["Carpi", "Athletic Carpi"],
  // Ligue 1
  ["Paris SG", "PSG"],
  ["Amiens", "Amiens SC"],
  ["St Etienne", "St-Etienne"],
  ["Evian Thonon Gaillard", "Thonon Evian"],
  // Premier League
  ["Ipswich", "Ipswich Town"],
  ["Leicester", "Leicester City"],
  ["Leeds", "Leeds United"],
  ["Luton", "Luton Town"],
  ["Blackburn", "Blackburn Rovers"],
  ["Wigan", "Wigan Athletic"],
]);

export const normalize_name = (name: string): string => {
  return exception_teams.get(name) ?? name;
};

export const map_team = (full_name: string): string => {
  return upcoming_map.get(full_name) ?? full_name;
};

export const map_team_name = (full_name: string): string => {
  return ODDS_MAP.get(full_name) ?? full_name;
};

export const toInt = (value: any): number | null => {
  const num = parseInt(value);
  return Number.isNaN(num) ? null : num;
};

// ESPN team name -> your DB team name. Unknown names fall through to map_team_name.
export const espnTeam = (name: string | undefined | null) =>
  name ? map_team_name(ESPN_MAP.get(name) ?? name) : "";

export const curSeason = "2026";
export const urlSeason = "2627";
