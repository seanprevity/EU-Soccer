import { and, eq, inArray, ne } from "drizzle-orm";
import { players, squad, teams } from "../../drizzle/schema";
import { db } from "../lib/db";

const TEAM_COACH: Record<string, string> = {
  // Premier League
  Arsenal: "Mikel Arteta",
  "Aston Villa": "Unai Emery",
  Bournemouth: "Marco Rose",
  Brentford: "Keith Andrews",
  Brighton: "Fabian Hürzeler",
  Chelsea: "Xabi Alonso",
  Coventry: "Frank Lampard",
  "Crystal Palace": "Pierre Sage",
  Everton: "David Moyes",
  Fulham: "Álvaro Arbeloa",
  Hull: "Sergej Jakirović",
  "Ipswich Town": "Gary O'Neil",
  "Leeds United": "Daniel Farke",
  Liverpool: "Andoni Iraola",
  "Man City": "Enzo Maresca",
  "Man United": "Michael Carrick",
  Newcastle: "Matthias Jaissle",
  "Nott'm Forest": "Oliver Glasner",
  Sunderland: "Régis Le Bris",
  Tottenham: "Roberto De Zerbi",

  // La Liga
  Alaves: "Quique Sánchez Flores",
  "Athletic Club": "Edin Terzić",
  "Atletico Madrid": "Diego Simeone",
  Osasuna: "Luis Miguel Ramis",
  "Celta Vigo": "Claudio Giráldez",
  Elche: "Martín Anselmi",
  Barcelona: "Hansi Flick",
  Getafe: "José Bordalás",
  Levante: "Luís Castro",
  Malaga: "Juanfran Funes",
  "Racing Santander": "José Alberto López",
  "Rayo Vallecano": "Beñat San José",
  "Deportivo": "Antonio Hidalgo",
  Espanyol: "Manolo González",
  "Real Betis": "Manuel Pellegrini",
  "Real Madrid": "José Mourinho",
  "Real Sociedad": "Pellegrino Matarazzo",
  Sevilla: "Matías Almeyda",
  Valencia: "Javier Aguirre",
  Villarreal: "Iñigo Pérez",

  // Serie A
  Atalanta: "Maurizio Sarri",
  Bologna: "Raffaele Palladino",
  Cagliari: "Fabio Pisacane",
  Como: "Cesc Fàbregas",
  Fiorentina: "Paolo Vanoli",
  Frosinone: "Massimiliano Alvini",
  Genoa: "Daniele De Rossi",
  Inter: "Cristian Chivu",
  Juventus: "Luciano Spalletti",
  Lazio: "Gennaro Gattuso",
  Lecce: "Eusebio Di Francesco",
  Milan: "Rúben Amorim",
  Monza: "Ivan Jurić",
  Napoli: "Massimiliano Allegri",
  Parma: "Alberto Gilardino",
  Roma: "Gian Piero Gasperini",
  Sassuolo: "Alberto Aquilani",
  Torino: "Ignazio Abate",
  Udinese: "Kosta Runjaić",
  Venezia: "Giovanni Stroppa",

  // Bundesliga
  "Bayern Munich": "Vincent Kompany",
  Dortmund: "Niko Kovač",
  "RB Leipzig": "Martín Demichelis",
  "VfB Stuttgart": "Sebastian Hoeneß",
  Hoffenheim: "Christian Ilzer",
  Leverkusen: "Carles Martínez",
  "SC Freiburg": "Julian Schuster",
  "Eintracht Frankfurt": "Adi Hütter",
  Augsburg: "Manuel Baum",
  Mainz: "Urs Fischer",
  "Union Berlin": "Mauro Lustrinelli",
  "M'gladbach": "Alexander Blessin",
  "Hamburger SV": "Merlin Polzin",
  "FC Koln": "René Wagner",
  "Werder Bremen": "Daniel Thioune",
  "Schalke 04": "Miron Muslić",
  Elversberg: "Vincent Wagner",
  Paderborn: "Ralf Kettemann",

  // Ligue 1
  Angers: "Stéphane Gilli",
  Auxerre: "Will Still",
  Brest: "Eric Roy",
  Nice: "Olivier Pantaloni",
  Lorient: "Alexandre Dujeux",
  "Le Havre": "Didier Digard",
  Lens: "Yannick Cahuzac",
  Lille: "Davide Ancelotti",
  Lyon: "Paulo Fonseca",
  Marseille: "Bruno Génésio",
  Monaco: "Filipe Luís",
  "Paris FC": "Liam Rosenior",
  PSG: "Luis Enrique",
  Rennes: "Habib Beye",
  "Le Mans": "Patrick Videira",
  Strasbourg: "Hugo Oliveira",
  Toulouse: "Jens Berthel Askou",
  Troyes: "Stéphane Dumont",
};

async function updateCoaches() {
  const entries = Object.entries(TEAM_COACH).filter(([, coach]) =>
    coach.trim(),
  );

  // Team names must match the teams table, or the squad foreign key rejects the insert
  const known = new Set(
    (await db.select({ name: teams.teamName }).from(teams)).map((t) => t.name),
  );
  const unknownTeams = entries
    .filter(([team]) => !known.has(team))
    .map(([t]) => t);
  if (unknownTeams.length) {
    console.error(
      `Unknown team names, fix these and rerun:\n  ${unknownTeams.join("\n  ")}`,
    );
    process.exit(1);
  }

  // Coaches whose name appears twice would end up at two clubs
  const coachNames = entries.map(([, coach]) => coach);
  const dupes = coachNames.filter((c, i) => coachNames.indexOf(c) !== i);
  if (dupes.length) {
    console.error(
      `Coach listed for more than one team: ${[...new Set(dupes)].join(", ")}`,
    );
    process.exit(1);
  }

  const teamNames = entries.map(([team]) => team);

  // League for each team, taken from its synced players
  const leagueRows = await db
    .selectDistinct({ team: squad.team, league: squad.league })
    .from(squad)
    .where(and(inArray(squad.team, teamNames), ne(squad.position, "Coach")));
  const leagueOf = new Map(
    leagueRows
      .filter((r) => r.team && r.league)
      .map((r) => [r.team!, r.league!]),
  );

  await db.transaction(async (tx) => {
    // players row first, for the foreign key
    await tx
      .insert(players)
      .values(coachNames.map((name) => ({ name })))
      .onConflictDoNothing();

    // Clear every coach row for these teams, plus any old row for these coaches at another club
    await tx
      .delete(squad)
      .where(and(eq(squad.position, "Coach"), inArray(squad.team, teamNames)));
    await tx
      .delete(squad)
      .where(
        and(eq(squad.position, "Coach"), inArray(squad.player, coachNames)),
      );

    await tx.insert(squad).values(
      entries.map(([team, coach]) => ({
        player: coach,
        team,
        position: "Coach",
        number: 0,
        league: leagueOf.get(team) ?? null,
      })),
    );
  });

  const noLeague = teamNames.filter((t) => !leagueOf.has(t));
  console.log(`Coaches set for ${entries.length} teams.`);
  if (noLeague.length)
    console.warn(
      `No synced players for these teams, so their coach has no league yet: ${noLeague.join(", ")}`,
    );
  const skipped = Object.entries(TEAM_COACH)
    .filter(([, c]) => !c.trim())
    .map(([t]) => t);
  if (skipped.length)
    console.warn(`Skipped (no coach set): ${skipped.join(", ")}`);
}

updateCoaches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to update coaches:", error);
    process.exit(1);
  });
