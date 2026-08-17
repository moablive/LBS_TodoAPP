import { db } from './client.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql\ALTER TABLE user_prefs ADD COLUMN IF NOT EXISTS ics_export_token varchar(36);\);
    console.log('Successfully added ics_export_token column!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
main();
