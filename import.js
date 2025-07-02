import { Client } from 'pg';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';
import config from './config/output.config.js';
dotenv.config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Configure CSV output
const csvWriter = createObjectCsvWriter({
  path: config.productionIdentifiersFilename,
  header: [{ id: 'constructed_id', title: 'constructed_id' }],
});

const importConstructedIds = async () => {
  try {
    await client.connect();

    const result = await client.query(`
      SELECT 
        COALESCE("BodyHref", "ModelHref") || '--' || "PartNumber" AS constructed_id
      FROM public.canam_parts;
    `);

    const records = result.rows;

    await csvWriter.writeRecords(records);

    console.log(`✅ Exported ${records.length} constructed IDs to constructed_ids.csv`);
  } catch (err) {
    console.error('❌ Failed to export constructed IDs:', err);
  } finally {
    await client.end();
  }
};

importConstructedIds();
