import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema";
import { env } from "../config/env";

const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });

export default client;
