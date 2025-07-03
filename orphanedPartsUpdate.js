import { readJson } from '/lib/utils.js';
import { getPartsFromVehicleHref } from './lib/navigation.js'
import { withLogin } from './lib/utils.js';
import config from './config/output.config.js';

export const orphanedPartsUpdate = () => {
  const partsOrphaned = readJson(config.partsOrphanedFilename);
  withLogin(async page => {
    const hrefs = partsOrphaned.map(po => po.split('--'));
    hrefs.forEach(href => {
      getPartsFromVehicleHref(page, href);

    });
  });
};;
// PGPASSWORD="pbe818dbe232a3427144cb7946eccc376f8e3d5477c83a1157d49cb75a9836395" \
// PGSSLMODE=require \
// pg_dump \
//   -h c80gfcbjoetpp3.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com \
//   -U u4ab783dn6u077 \
//   -d d2r1v46ch11o4e \
//   -t 'public."DG_PartPriceDetail"' \
//   --schema-only \
//   --no-owner \
//   --no-comments \
//   -f DG_PartPriceDetail_schema.sql && echo "✅ Schema dumped to DG_PartPriceDetail_schema.sql"

// PGPASSWORD="pbe818dbe232a3427144cb7946eccc376f8e3d5477c83a1157d49cb75a9836395" \
// PGSSLMODE=require \
// pg_dump \
//   -h c80gfcbjoetpp3.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com \
//   -U u4ab783dn6u077 \
//   -d d2r1v46ch11o4e \
//   -t 'public."DG_PartPriceDetail"' \
//   --data-only \
//   --column-inserts \
//   --no-owner \
//   --no-comments \
//   -f DG_PartPriceDetail_data.sql && echo "✅ Data dumped to DG_PartPriceDetail_data.sql"

// psql -U alexsanudo -d dynasty-dev -f DG_PartPriceDetail_schema.sql
// psql -U alexsanudo -d dynasty-dev -f DG_PartPriceDetail_data.sql
