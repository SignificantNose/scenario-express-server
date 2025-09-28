import { Pool } from "pg";
import config from "@assets/config";

export const pool = new Pool({
  connectionString: config.db.url,
});

