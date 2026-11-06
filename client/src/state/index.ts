import { genCurrentSeason } from "@/lib/utils";
import { MatchFilters } from "@epl/shared";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type MatchHistoryEntry = { filters: MatchFilters; page: number };

interface GlobalState {
  theme: "light" | "dark";
  language: string;
  priority: "upcoming" | "table";
  tab: "History" | "Table" | "Squad";
  league: string;
  season: string;
  matchDate: string;
  h2hPage: number;
  // Keyed by list and team, e.g. "team:Arsenal", "preview-home:Arsenal"
  matchHistory: Record<string, MatchHistoryEntry>;
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
  matchHistory: {},
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
    setMatchHistory: (
      state,
      action: PayloadAction<{
        key: string;
        filters?: Partial<MatchFilters>;
        page?: number;
      }>,
    ) => {
      const { key, filters, page } = action.payload;
      const entry = state.matchHistory[key] ?? { filters: {}, page: 0 };
      if (filters) {
        entry.filters = { ...entry.filters, ...filters };
        entry.page = 0;
      }
      if (page !== undefined) entry.page = page;
      state.matchHistory[key] = entry;
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
  setMatchHistory,
} = globalSlice.actions;
export default globalSlice.reducer;
