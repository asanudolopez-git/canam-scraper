// NOTES SO FAR
// // DELETE ID from partsbyvehicle
// import fs from 'fs';
// import { sanitizeParts } from './utils.js';
// import config from './config/output.config.js';
// const foo = () => {
//   const partsByVehicle = JSON.parse(fs.readFileSync('tmp/partsByVehicle2.json', 'utf8')) || {};
//   const newPartsByVehicle = {}
//   Object.entries(partsByVehicle).forEach(([vehicle, parts]) => {
//     newPartsByVehicle[vehicle] = sanitizeParts(parts);
//   })
//   fs.writeFileSync(config.partsByVehicleFilename, JSON.stringify(newPartsByVehicle, null, 2));
// }
// foo();