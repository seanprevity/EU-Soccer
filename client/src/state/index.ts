import { genCurrentSeason } from "@/lib/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface GlobalState {
  theme: "light" | "dark";
  language: string;
  priority: "upcoming" | "table";
  tab: "History" | "Table" | "Squad";
  league: string;
  season: string;
  matchDate: string;
  h2hPage: number;
  homeRFPage: number;
  awayRFPage: number;
  teamPage: { team: string; page: number };
}

const today = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.toISOString();
};

const initialState: GlobalState = {
  theme: "light",
  language: "en",
  priority: "upcoming",
  tab: "History",
  league: "Premier League",
  season: genCurrentSeason(),
  matchDate: today(),
  h2hPage: 0,
  homeRFPage: 0,
  awayRFPage: 0,
  teamPage: { team: "", page: 0 },
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setPriority: (state, action: PayloadAction<"upcoming" | "table">) => {
      state.priority = action.payload;
    },
    setSeason: (state, action: PayloadAction<string>) => {
      state.season = action.payload;
    },
    setLeague: (state, action: PayloadAction<string>) => {
      state.league = action.payload;
    },
    setTab: (state, action: PayloadAction<"History" | "Table" | "Squad">) => {
      state.tab = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setMatchDate: (state, action: PayloadAction<string>) => {
      state.matchDate = action.payload;
    },
    setH2HPage: (state, action: PayloadAction<number>) => {
      state.h2hPage = action.payload;
    },
    setHomeRFPage: (state, action: PayloadAction<number>) => {
      state.homeRFPage = action.payload;
    },
    setAwayRFPage: (state, action: PayloadAction<number>) => {
      state.awayRFPage = action.payload;
    },
    setTeamPage: (
      state,
      action: PayloadAction<{ team: string; page: number }>,
    ) => {
      state.teamPage = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setLanguage,
  setPriority,
  setTab,
  setLeague,
  setSeason,
  setMatchDate,
  setH2HPage,
  setHomeRFPage,
  setAwayRFPage,
  setTeamPage,
} = globalSlice.actions;
export default globalSlice.reducer;
