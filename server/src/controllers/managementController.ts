import { Request, Response } from "express";
import {
  updateStandingsService,
  updateFutureMatchesService,
  updateMatchStatsService,
  updateTopGoalScorer,
  updatePlayerInfo,
  importHistoricalGoalScorers,
  updateOddsService,
  updateGSImageUrlService,
  updateSquadService,
} from "../services/managementService";
import {
  competition_codes,
  csv_urls,
  Leagues,
  odds_sports,
} from "../config/arrays";
import { curSeason, get_team_to_id_new, team_to_id } from "../utils/map";

export const updateAll = async (req: Request, res: Response): Promise<void> => {
  try {
    // Update historical stats (CSV)
    console.log("Updating match stats...");
    for (let i = 0; i < 5; i++)
      await updateMatchStatsService(csv_urls[i], Leagues[i]);

    // Update league standings + recent form
    console.log("Updating standings...");
    for (let i = 0; i < 5; i++)
      await updateStandingsService(Leagues[i], curSeason);

    // Update upcoming matches (and H2H)
    console.log("Updating upcoming matches...");
    for (let i = 0; i < 5; i++)
      await updateFutureMatchesService(competition_codes[i], Leagues[i]);

    // Update top goal scorers
    console.log("Updating top goal scorers...");
    for (let i = 0; i < 5; i++)
      await updateTopGoalScorer(Leagues[i], competition_codes[i], curSeason);

    // add images to goalScorers - might be heavy on the db
    console.log("Updating goal scorer images...");
    await updateGSImageUrlService(curSeason);

    // Update odds for new upcoming matches for each league
    console.log("Updating odds...");
    for (let i = 0; i < 5; i++) await updateOddsService(odds_sports[i]);

    res.status(200).send("All data updated successfully");
  } catch (err: any) {
    console.error("Full update failed:", err.message);
    res.status(500).send(err.message);
  }
};

// updates standings and recent form for teams - total , home , and away
export const updateStandings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateStandingsService(Leagues[i], curSeason);
    res.status(200).send("Standings updated successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

// updates match stats from csv urls
export const updateMatchStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateMatchStatsService(csv_urls[i], Leagues[i]);
    res.status(200).send("Match stats updated successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

// updates future matches and h2h records
export const updateFutureMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateFutureMatchesService(competition_codes[i], Leagues[i]);
    res.status(200).send("Matches updates successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateGoalScorers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++)
      await updateTopGoalScorer(Leagues[i], competition_codes[i], curSeason);
    // await importHistoricalGoalScorers("La_Liga.csv", Leagues[4]);
    // await updatePlayerInfo("Federico Bonazzoli");
    res.status(200).send("Goalscorers updated successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateOdds = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    for (let i = 0; i < 5; i++) await updateOddsService(odds_sports[i]);
    res.status(200).send("Odds updated successfuly");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateImageUrls = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await updateGSImageUrlService(curSeason);
    res.status(200).send("Image URLs updated successfully.");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export const updateSquad = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await updateSquadService("Torino", get_team_to_id_new("Torino"));
    //for (const inst of team_to_id)
    //  await updateSquadService(inst[0], inst[1]);
    res.status(200).send("Updated squad successfully");
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};
