import { genCurrentSeason } from "@/lib/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface GlobalState {
  theme: "light" | "dark";
  language: string;
  priority: "upcoming" | "table";
  tab: "History" | "Table" | "Squad";
  league: string;
  season: string;
}

const initialState: GlobalState = {
  theme: "light",
  language: "en",
  priority: "upcoming",
  tab: "History",
  league: "Premier League",
  season: genCurrentSeason(),
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
} = globalSlice.actions;
export default globalSlice.reducer;
