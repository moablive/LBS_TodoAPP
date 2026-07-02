import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority" varchar(10) DEFAULT 'low' NOT NULL;`);
    console.log("Column added successfully!");
  } catch (e) {
    console.error("Error adding column:", e);
  }
  process.exit(0);
}

main();
