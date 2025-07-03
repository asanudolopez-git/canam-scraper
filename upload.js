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
const TABLE = process.env.DB_TABLE;
const BATCH_SIZE = 500;

export const update = async client => {
  const skippedRows = [];
  let totalUpdated = 0;
  const parts = await readCsv(config.partsToUpdateFilename);
  console.log(`📦 Loaded ${parts.length} rows from CSV`);

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
        `UPDATE public."${TABLE}"
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

  // Write skipped rows to CSV
  if (skippedRows.length) {
    const csvWriter = createObjectCsvWriter({
      path: config.skippedUploadsFilename,
      header: Object.keys(skippedRows[0]).map((key) => ({
        id: key,
        title: key,
      })),
    });

    await csvWriter.writeRecords(skippedRows);
    console.log(`⚠️  ${skippedRows.length} rows skipped (no match found) — saved to ${config.skippedUploadsFilename}`);
  }

  console.log(`✅ Done. Updated ${totalUpdated} rows.`);
};

const create = async client => {
  let totalUpserts = 0;
  let totalFailed = 0;
  const parts = await readCsv(config.partsToCreateFilename);
  console.log(`📦 Loaded ${parts.length} rows for UPSERT`);

  for (let i = 0; i < parts.length; i += BATCH_SIZE) {
    const batch = parts.slice(i, i + BATCH_SIZE);
    console.log(`🔁 UPSERT batch ${i / BATCH_SIZE + 1} (${batch.length} rows)...`);

    await client.query('BEGIN');

    for (const part of batch) {
      const {
        Year, Make, Model, Body, PartNumber,
        Description, WebsitePrice1_CanAm, Availability, Ships,
        ShopPartPrice1_CanAm, ShopPartPriceOveride,
        RainSensor, LaneDeparture, Acoustic, ElectrochromaticMirror,
        HeatedWiperPark, CondensationSensor, HeatedWindshield,
        HeadsupDispplay, ForwardCollisionAlert, Logo, HumiditySensor,
        YearHref, MakeHref, ModelHref, BodyHref
      } = part;

      try {
        await client.query(
          `INSERT INTO public."${TABLE}" (
            "Year", "Make", "Model", "Body", "PartNumber",
            "Description", "WebsitePrice1_CanAm", "Availability", "Ships",
            "ShopPartPrice1_CanAm", "ShopPartPriceOveride",
            "RainSensor", "LaneDeparture", "Acoustic", "ElectrochromaticMirror",
            "HeatedWiperPark", "CondensationSensor", "HeatedWindshield",
            "HeadsupDispplay", "ForwardCollisionAlert", "Logo", "HumiditySensor",
            "YearHref", "MakeHref", "ModelHref", "BodyHref",
            last_updated
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18,
            $19, $20, $21, $22,
            $23, $24, $25, $26,
            NOW()
          )
          ON CONFLICT ("Year", "Make", "Model", "Body", "PartNumber")
          DO UPDATE SET
            "Description" = EXCLUDED."Description",
            "WebsitePrice1_CanAm" = EXCLUDED."WebsitePrice1_CanAm",
            "Availability" = EXCLUDED."Availability",
            "Ships" = EXCLUDED."Ships",
            "ShopPartPrice1_CanAm" = EXCLUDED."ShopPartPrice1_CanAm",
            "ShopPartPriceOveride" = EXCLUDED."ShopPartPriceOveride",
            "RainSensor" = EXCLUDED."RainSensor",
            "LaneDeparture" = EXCLUDED."LaneDeparture",
            "Acoustic" = EXCLUDED."Acoustic",
            "ElectrochromaticMirror" = EXCLUDED."ElectrochromaticMirror",
            "HeatedWiperPark" = EXCLUDED."HeatedWiperPark",
            "CondensationSensor" = EXCLUDED."CondensationSensor",
            "HeatedWindshield" = EXCLUDED."HeatedWindshield",
            "HeadsupDispplay" = EXCLUDED."HeadsupDispplay",
            "ForwardCollisionAlert" = EXCLUDED."ForwardCollisionAlert",
            "Logo" = EXCLUDED."Logo",
            "HumiditySensor" = EXCLUDED."HumiditySensor",
            "YearHref" = EXCLUDED."YearHref",
            "MakeHref" = EXCLUDED."MakeHref",
            "ModelHref" = EXCLUDED."ModelHref",
            "BodyHref" = EXCLUDED."BodyHref",
            last_updated = NOW();`
          ,
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
            YearHref,
            MakeHref,
            ModelHref,
            BodyHref,
          ]
        );

        totalUpserts++;
      } catch (err) {
        totalFailed++;
        console.warn(`❌ Failed UPSERT for ${PartNumber}:`, err.message);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Batch ${i / BATCH_SIZE + 1} committed`);
  }
  console.log(`🎉 Done. Total upserts: ${totalUpserts}, failed inserts: ${totalFailed}`);
};



const upload = async () => {
  await client.connect();
  await update(client);
  await create(client);
  client.end();
}
export default upload;

upload().catch((err) => {
  console.error('❌ Fatal insert error:', err);
  process.exit(1);
});;;