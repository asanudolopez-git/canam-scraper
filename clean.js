import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
const TABLE = 'canam_parts';

const addLastUpdatedColumn = async () => {
  try {
    await client.connect();

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = '${TABLE}'
            AND table_schema = 'public'
            AND column_name = 'last_updated'
        ) THEN
          ALTER TABLE public.canam_parts
          ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
        END IF;
      END
      $$;
    `);

    console.log('✅ Column "last_updated" added (if not already present)');
  } catch (err) {
    console.error('❌ Failed to add column:', err.message);
  } finally {
    await client.end();
  }
};

const deleteAndNormalize = async () => {
  try {
    await client.connect();

    // Step 1: Delete duplicates while keeping latest
    await client.query(`
      DELETE FROM public.${TABLE} a
      USING public.canam_parts b
      WHERE a.ctid < b.ctid
        AND a."Year" = b."Year"
        AND a."Make" = b."Make"
        AND a."Model" = b."Model"
        AND a."Body" IS NOT DISTINCT FROM b."Body"
        AND a."PartNumber" = b."PartNumber"
        RETURNING a."Year", a."Make", a."Model", a."Body", a."PartNumber";
    `);

    const deletedCount = deleteResult.rowCount;
    const deletedRows = deleteResult.rows;

    console.log(`🗑️ Deleted ${deletedCount} duplicate rows.`);
    console.log('🔍 Sample deleted rows:');
    console.table(deletedRows.slice(0, 10));


    // Step 2: Trim and normalize text fields
    await client.query(`
      UPDATE public.${TABLE}
      SET
        "Make" = TRIM("Make"),
        "Model" = TRIM("Model"),
        "Body" = TRIM("Body"),
        "PartNumber" = TRIM("PartNumber");
    `);

    console.log('✅ Fields normalized.');
  } catch (err) {
    console.error('❌ Error cleaning duplicates:', err);
  } finally {
    await client.end();
  }
};
const clean = async () => {
  await addLastUpdatedColumn();
  await deleteAndNormalize();
}
export default clean;

clean().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
