import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { runFullDatasetImportAndSeed } from '../services/demoScenarioSeeder';

dotenv.config();

async function main() {
  try {
    await connectDatabase();
    const stats = await runFullDatasetImportAndSeed();
    console.log('[Seed Script] Completed successfully:', stats);
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Script] Error:', err);
    process.exit(1);
  }
}

main();
