/** Create the SQLite database and schema (idempotent). */
import { getDb } from "../src/lib/db";

getDb();
console.log("Database initialized.");
