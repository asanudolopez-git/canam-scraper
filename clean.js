import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // required for AWS RDS
  },
});

const TABLE = process.env.DB_TABLE;

export const addLastUpdatedColumn = async client => {
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = '${TABLE}'
            AND column_name = 'last_updated'
        ) THEN
          EXECUTE format('ALTER TABLE public.%I ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW()', '${TABLE}');
        END IF;
      END
      $$;
    `);

    console.log('✅ Column "last_updated" added (if not already present)');
  } catch (err) {
    console.error('❌ Failed to add column:', err.message);
  }
};

export const addUniqueConstraint = async client => {
  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'unique_part_combination'
            AND conrelid = 'public."${TABLE}"'::regclass
        ) THEN
          ALTER TABLE public."${TABLE}"
          ADD CONSTRAINT unique_part_combination
          UNIQUE ("Year", "Make", "Model", "Body", "PartNumber");
        END IF;
      END
      $$;
    `)
    console.log('✅ Added Unique constraint on Year, Make, Model, Body, PartNumber');
  } catch (err) {
    console.error('❌ Failed to add unique constraint:', err.message);
  }
}


export const deleteAndNormalize = async client => {
  try {
    const deleteSQL = `
      DELETE FROM public."${TABLE}" a
      USING public."${TABLE}" b
      WHERE a.ctid < b.ctid
        AND a."Year" = b."Year"
        AND a."Make" = b."Make"
        AND a."Model" = b."Model"
        AND a."Body" IS NOT DISTINCT FROM b."Body"
        AND a."PartNumber" = b."PartNumber"
      RETURNING a."Year", a."Make", a."Model", a."Body", a."PartNumber";
    `;

    const deleteResult = await client.query(deleteSQL);

    const deletedCount = deleteResult.rowCount;
    const deletedRows = deleteResult.rows;

    console.log(`🗑️ Deleted ${deletedCount} duplicate rows.`);
    console.table(deletedRows.slice(0, 10));

    const updateSQL = `
      UPDATE public."${TABLE}"
      SET
        "Make" = TRIM("Make"),
        "Model" = TRIM("Model"),
        "Body" = TRIM("Body"),
        "PartNumber" = TRIM("PartNumber");
    `;

    await client.query(updateSQL);

    console.log('✅ Fields normalized.');
  } catch (err) {
    console.error('❌ Error cleaning duplicates:', err.message || err);
  }
};

const clean = async () => {
  await client.connect();
  await addLastUpdatedColumn(client);
  await deleteAndNormalize(client);
  await addUniqueConstraint(client);
  await client.end();
};
export default clean;

clean().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
