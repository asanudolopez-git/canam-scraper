import { Client } from 'pg';
import { createObjectCsvWriter } from 'csv-writer';
import dotenv from 'dotenv';
import config from './config/output.config.js';
import { readCsv, toInt, toNum } from './lib/utils.js';
dotenv.config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const BATCH_SIZE = 500;

const skippedRows = [];
let totalUpdated = 0;

const run = async () => {
  const parts = await readCsv(config.partsToUpdateFilename);
  console.log(`📦 Loaded ${parts.length} rows from CSV`);

  await client.connect();

  for (let i = 0; i < parts.length; i += BATCH_SIZE) {
    const batch = parts.slice(i, i + BATCH_SIZE);
    console.log(`🔁 Processing batch ${i / BATCH_SIZE + 1} (${batch.length} rows)...`);

    await client.query('BEGIN');

    for (const part of batch) {
      const {
        Year, Make, Model, Body, PartNumber,
        Description, WebsitePrice1_CanAm, Availability, Ships,
        ShopPartPrice1_CanAm, ShopPartPriceOveride,
        RainSensor, LaneDeparture, Acoustic, ElectrochromaticMirror,
        HeatedWiperPark, CondensationSensor, HeatedWindshield,
        HeadsupDispplay, ForwardCollisionAlert, Logo, HumiditySensor,
      } = part;

      const res = await client.query(
        `UPDATE public.canam_parts
         SET
           "Description" = $6,
           "WebsitePrice1_CanAm" = $7,
           "Availability" = $8,
           "Ships" = $9,
           "ShopPartPrice1_CanAm" = $10,
           "ShopPartPriceOveride" = $11,
           "RainSensor" = $12,
           "LaneDeparture" = $13,
           "Acoustic" = $14,
           "ElectrochromaticMirror" = $15,
           "HeatedWiperPark" = $16,
           "CondensationSensor" = $17,
           "HeatedWindshield" = $18,
           "HeadsupDispplay" = $19,
           "ForwardCollisionAlert" = $20,
           "Logo" = $21,
           "HumiditySensor" = $22,
           last_updated = NOW()
         WHERE
           "Year" = $1 AND
           "Make" = $2 AND
           "Model" = $3 AND
           COALESCE("Body", '') = COALESCE($4, '') AND
           "PartNumber" = $5`,
        [
          parseInt(Year),
          Make,
          Model,
          Body,
          PartNumber,
          Description,
          WebsitePrice1_CanAm,
          Availability,
          Ships,
          toNum(ShopPartPrice1_CanAm),
          toNum(ShopPartPriceOveride),
          toInt(RainSensor),
          toInt(LaneDeparture),
          toInt(Acoustic),
          toInt(ElectrochromaticMirror),
          toInt(HeatedWiperPark),
          toInt(CondensationSensor),
          toInt(HeatedWindshield),
          toInt(HeadsupDispplay),
          toInt(ForwardCollisionAlert),
          toInt(Logo),
          toInt(HumiditySensor),
        ]
      );

      if (res.rowCount === 0) {
        skippedRows.push(part);
      } else {
        totalUpdated += res.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Committed batch ${i / BATCH_SIZE + 1}`);
  }

  await client.end();

  // Write skipped rows to CSV
  if (skippedRows.length) {
    const csvWriter = createObjectCsvWriter({
      path: 'skipped_parts.csv',
      header: Object.keys(skippedRows[0]).map((key) => ({
        id: key,
        title: key,
      })),
    });

    await csvWriter.writeRecords(skippedRows);
    console.log(`⚠️  ${skippedRows.length} rows skipped (no match found) — saved to skipped_parts.csv`);
  }

  console.log(`✅ Done. Updated ${totalUpdated} rows.`);
};

run().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});