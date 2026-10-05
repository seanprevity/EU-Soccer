import { cn } from "./utils";

export type TeamColor = {
  team: string;
  primary: string;
  secondary: string;
};

// Hex values approximate each club's colours. Where a club plays in white, primary is
// its main trim colour, since white fills don't show up on a white page.
export const TEAM_COLORS: TeamColor[] = [
  // Premier League
  { team: "Arsenal", primary: "#EF0107", secondary: "#FFFFFF" },
  { team: "Aston Villa", primary: "#670E36", secondary: "#95BFE5" },
  { team: "Bournemouth", primary: "#DA291C", secondary: "#000000" },
  { team: "Brentford", primary: "#E30613", secondary: "#FFFFFF" },
  { team: "Brighton", primary: "#0057B8", secondary: "#FFFFFF" },
  { team: "Chelsea", primary: "#034694", secondary: "#FFFFFF" },
  { team: "Coventry", primary: "#59CBE8", secondary: "#FFFFFF" },
  { team: "Crystal Palace", primary: "#1B458F", secondary: "#C4122E" },
  { team: "Everton", primary: "#003399", secondary: "#FFFFFF" },
  { team: "Fulham", primary: "#000000", secondary: "#FFFFFF" },
  { team: "Hull", primary: "#F5A12D", secondary: "#000000" },
  { team: "Ipswich Town", primary: "#3A64A3", secondary: "#FFFFFF" },
  { team: "Leeds United", primary: "#FFCD00", secondary: "#1D428A" },
  { team: "Liverpool", primary: "#C8102E", secondary: "#FFFFFF" },
  { team: "Man City", primary: "#6CABDD", secondary: "#1C2C5B" },
  { team: "Man United", primary: "#DA291C", secondary: "#000000" },
  { team: "Newcastle", primary: "#000000", secondary: "#FFFFFF" },
  { team: "Nott'm Forest", primary: "#DD0000", secondary: "#FFFFFF" },
  { team: "Sunderland", primary: "#EB172B", secondary: "#FFFFFF" },
  { team: "Tottenham", primary: "#152357", secondary: "#FFFFFF" },

  // La Liga
  { team: "Alaves", primary: "#0761AF", secondary: "#FFFFFF" },
  { team: "Athletic Club", primary: "#EE2523", secondary: "#FFFFFF" },
  { team: "Atletico Madrid", primary: "#CB3524", secondary: "#272E61" },
  { team: "Barcelona", primary: "#A50044", secondary: "#004D98" },
  { team: "Celta Vigo", primary: "#8AC3EE", secondary: "#E5254E" },
  { team: "Deportivo", primary: "#0067B1", secondary: "#FFFFFF" },
  { team: "Elche", primary: "#05642C", secondary: "#FFFFFF" },
  { team: "Espanyol", primary: "#007FC8", secondary: "#FFFFFF" },
  { team: "Getafe", primary: "#005999", secondary: "#FFFFFF" },
  { team: "Levante", primary: "#B4053F", secondary: "#1C3C8B" },
  { team: "Malaga", primary: "#6DADDF", secondary: "#FFFFFF" },
  { team: "Osasuna", primary: "#D91A21", secondary: "#0A346F" },
  { team: "Racing Santander", primary: "#00873E", secondary: "#FFFFFF" },
  { team: "Rayo Vallecano", primary: "#E53027", secondary: "#FFFFFF" },
  { team: "Real Betis", primary: "#00954C", secondary: "#FFFFFF" },
  { team: "Real Madrid", primary: "#00529F", secondary: "#FEBE10" },
  { team: "Real Sociedad", primary: "#143C8B", secondary: "#FFFFFF" },
  { team: "Sevilla", primary: "#D81E05", secondary: "#FFFFFF" },
  { team: "Valencia", primary: "#000000", secondary: "#EE3524" },
  { team: "Villarreal", primary: "#FFE667", secondary: "#005187" },

  // Serie A
  { team: "Atalanta", primary: "#1E71B8", secondary: "#000000" },
  { team: "Bologna", primary: "#A21C26", secondary: "#1A2F48" },
  { team: "Cagliari", primary: "#A80532", secondary: "#002350" },
  { team: "Como", primary: "#0D5EAF", secondary: "#FFFFFF" },
  { team: "Fiorentina", primary: "#482E92", secondary: "#FFFFFF" },
  { team: "Frosinone", primary: "#FFDD00", secondary: "#0055A5" },
  { team: "Genoa", primary: "#AD0D1B", secondary: "#001D3D" },
  { team: "Inter", primary: "#010E80", secondary: "#000000" },
  { team: "Juventus", primary: "#000000", secondary: "#FFFFFF" },
  { team: "Lazio", primary: "#87D8F7", secondary: "#FFFFFF" },
  { team: "Lecce", primary: "#FFE400", secondary: "#DA251D" },
  { team: "Milan", primary: "#FB090B", secondary: "#000000" },
  { team: "Monza", primary: "#E2001A", secondary: "#FFFFFF" },
  { team: "Napoli", primary: "#12A0D7", secondary: "#FFFFFF" },
  { team: "Parma", primary: "#FFD200", secondary: "#1B4F9C" },
  { team: "Roma", primary: "#8E1F2F", secondary: "#F0BC42" },
  { team: "Sassuolo", primary: "#00A752", secondary: "#000000" },
  { team: "Torino", primary: "#8A1E03", secondary: "#FFFFFF" },
  { team: "Udinese", primary: "#000000", secondary: "#FFFFFF" },
  { team: "Venezia", primary: "#000000", secondary: "#F48120" },

  // Bundesliga
  { team: "Augsburg", primary: "#BA3733", secondary: "#46714D" },
  { team: "Bayern Munich", primary: "#DC052D", secondary: "#0066B2" },
  { team: "Dortmund", primary: "#FDE100", secondary: "#000000" },
  { team: "Eintracht Frankfurt", primary: "#E1000F", secondary: "#000000" },
  { team: "Elversberg", primary: "#000000", secondary: "#FFFFFF" },
  { team: "FC Koln", primary: "#ED1C24", secondary: "#FFFFFF" },
  { team: "Hamburger SV", primary: "#0A3F86", secondary: "#FFFFFF" },
  { team: "Hoffenheim", primary: "#1961B5", secondary: "#FFFFFF" },
  { team: "Leverkusen", primary: "#E32221", secondary: "#000000" },
  { team: "M'gladbach", primary: "#FFFFFF", secondary: "#00A651" },
  { team: "Mainz", primary: "#C3141E", secondary: "#FFFFFF" },
  { team: "Paderborn", primary: "#005CA9", secondary: "#000000" },
  { team: "RB Leipzig", primary: "#DD0741", secondary: "#FFFFFF" },
  { team: "SC Freiburg", primary: "#E30613", secondary: "#000000" },
  { team: "Schalke 04", primary: "#004D9D", secondary: "#FFFFFF" },
  { team: "Union Berlin", primary: "#EB1923", secondary: "#FFFFFF" },
  { team: "VfB Stuttgart", primary: "#E32219", secondary: "#FFFFFF" },
  { team: "Werder Bremen", primary: "#1D9053", secondary: "#FFFFFF" },

  // Ligue 1
  { team: "Angers", primary: "#000000", secondary: "#FFFFFF" },
  { team: "Auxerre", primary: "#0064B0", secondary: "#FFFFFF" },
  { team: "Brest", primary: "#E30613", secondary: "#FFFFFF" },
  { team: "Le Havre", primary: "#6EB2E0", secondary: "#0C2240" },
  { team: "Le Mans", primary: "#DA251D", secondary: "#FFDD00" },
  { team: "Lens", primary: "#FFE600", secondary: "#E2001A" },
  { team: "Lille", primary: "#E01E13", secondary: "#20325F" },
  { team: "Lorient", primary: "#F58113", secondary: "#000000" },
  { team: "Lyon", primary: "#1D3A83", secondary: "#E30613" },
  { team: "Marseille", primary: "#2FAEE0", secondary: "#FFFFFF" },
  { team: "Monaco", primary: "#E51B22", secondary: "#FFFFFF" },
  { team: "Nice", primary: "#CE1126", secondary: "#000000" },
  { team: "Paris FC", primary: "#1A3A6E", secondary: "#89CFF0" },
  { team: "PSG", primary: "#004170", secondary: "#DA291C" },
  { team: "Rennes", primary: "#E13327", secondary: "#000000" },
  { team: "Strasbourg", primary: "#009FE3", secondary: "#FFFFFF" },
  { team: "Toulouse", primary: "#5B3B8C", secondary: "#FFFFFF" },
  { team: "Troyes", primary: "#1C4F9C", secondary: "#FFFFFF" },
];

const BY_TEAM = new Map(TEAM_COLORS.map((c) => [c.team, c]));

// Teams not in the list get neutral grays instead of breaking
const FALLBACK: Omit<TeamColor, "team"> = {
  primary: "#6B7280",
  secondary: "#E5E7EB",
};

export const getTeamColors = (team: string) =>
  BY_TEAM.get(team) ?? { team, ...FALLBACK };

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// White or near-black text, whichever reads better on this background
export const readableText = (hex: string) =>
  luminance(hex) > 0.4 ? "#111827" : "#FFFFFF";

const distance = (a: string, b: string) => {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

// colors for a fixture
export const matchColors = (homeTeam: string, awayTeam: string) => {
  const home = getTeamColors(homeTeam).primary;
  const away = getTeamColors(awayTeam);
  const awayColor =
    distance(home, away.primary) < 120 ? away.secondary : away.primary;
  return {
    home: { bg: home, text: readableText(home) },
    away: { bg: awayColor, text: readableText(awayColor) },
  };
};

// Outline club colours that would vanish into the panel: near-white in light mode
export const edgeFor = (hex: string) =>
  cn(luminance(hex) > 0.8 && "ring-1 ring-inset ring-gray-300 dark:ring-0");
