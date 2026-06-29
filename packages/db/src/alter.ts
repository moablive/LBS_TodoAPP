import { db } from "./index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "task_groups" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;`);
    console.log("Column added successfully!");
  } catch (e) {
    console.error("Error adding column:", e);
  }
  process.exit(0);
}

main();
