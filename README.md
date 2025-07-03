# CAN-AM Parts Scraper{#home}
1. [Clean](#clean)
2. [Populate](#populate)
3. [Scrape](#scrape)
4. [Import Identifiers](#import)
5. [Export CSV's](#export)
6. [Upload](#upload)

## Clean{#clean} 

`npm run clean`

Create last_updated column, delete Ddplicate parts while keeping the latest row, and normalize keys ensuring no stray spaces or case mismatches cause false negatives during joins.
## Populate
<a name="populate"></a>

`npm run populate`

Populate all of the hrefs by year, make, model, and body style. These are the hrefs for every vehicle.
  * Note, this should ideally only be run on the latest year, since there won't be new vehicle types before the current year.

This will populate `fixtures/hrefs.json` with e.g:
```
{
  "2000": {
    "Audi": {
      "href": "https://www.canamautoglass.ca/nags/2000/AUDI",
      "models": {
        "A4": {
          "href": "https://www.canamautoglass.ca/nags/2000/AUDI/63",
          "bodyStyles": {
            "Avant 4 Door Station Wagon": {
              "href": "https://www.canamautoglass.ca/nags/2000/AUDI/63/50964"
            }
          }
        }
      }
    }
  }
}
```
And also `fixtures/vehiclesByYear.json` with e.g:
```
{
  "2000": [
    {
      "Year": "2000",
      "Make": "Audi",
      "MakeHref": "https://www.canamautoglass.ca/nags/2000/AUDI",
      "Model": "A4",
      "ModelHref": "https://www.canamautoglass.ca/nags/2000/AUDI/63",
      "Body": "4 Door Sedan",
      "BodyHref": "https://www.canamautoglass.ca/nags/2000/AUDI/63/50942",
      "PartNumber": "",
      "Description": "",
      "WebsitePrice1_CanAm": "",
      "Availability": "",
      "Ships": "",
      "ShopPartPrice1_CanAm": 0,
      "ShopPartPriceOveride": 0,
      "RainSensor": 0,
      "LaneDeparture": 0,
      "Acoustic": 0,
      "ElectrochromaticMirror": 0,
      "HeatedWiperPark": 0,
      "CondensationSensor": 0,
      "HeatedWindshield": 0,
      "HeadsupDispplay": 0,
      "ForwardCollisionAlert": 0,
      "Logo": 0,
      "HumiditySensor": 0,
      "ShopPriceList2_VanFax": 0,
      "ShopPriceList3_Benson": 0,
      "ShopPriceList4_PGW": 0
    }
  ]
}
```
## Scrape
<a name="scrape"></a>

`npm run scrape`

This will populate `tmp/partsByVehicle.json` with e.g:
```
{
  "https://www.canamautoglass.ca/nags/2025/ACURA/11": [
    {
      "Year": "2025",
      "YearHref": "https://www.canamautoglass.ca/nags/2025/",
      "Make": "Acura",
      "MakeHref": "https://www.canamautoglass.ca/nags/2025/ACURA",
      "Model": "Integra",
      "ModelHref": "https://www.canamautoglass.ca/nags/2025/ACURA/11",
      "Body": "",
      "BodyHref": "",
      "PartNumber": "FW05681GTYNALT",
      "Description": "(Solar) (Green Tint) Acoustic Infrared Interlayer Collision Mitigation Braking System Forward Collision Alert Road Departure Mitigation System LDWS Adaptive Cruise Control Lane Keep Assist Traffic Jam Assist Traffic Sign Recognition",
      "WebsitePrice1_CanAm": "$211.70",
      "Availability": "In Stock",
      "Ships": "Immediately",
      "ShopPartPrice1_CanAm": null,
      "ShopPartPriceOveride": 0,
      "RainSensor": 1,
      "LaneDeparture": 0,
      "Acoustic": 0,
      "ElectrochromaticMirror": 0,
      "HeatedWiperPark": 1,
      "CondensationSensor": 1,
      "HeatedWindshield": 1,
      "HeadsupDispplay": 1,
      "ForwardCollisionAlert": 0,
      "Logo": 0,
      "HumiditySensor": 1,
      "ShopPriceList2_VanFax": null,
      "ShopPriceList3_Benson": null,
      "ShopPriceList4_PGW": null
    }
  ]
}
```
And also `fixtures/parts.json` with e.g:
```
[
  {
    "Year": "2025",
    "YearHref": "https://www.canamautoglass.ca/nags/2025/",
    "Make": "Acura",
    "MakeHref": "https://www.canamautoglass.ca/nags/2025/ACURA",
    "Model": "Integra",
    "ModelHref": "https://www.canamautoglass.ca/nags/2025/ACURA/11",
    "Body": "",
    "BodyHref": "",
    "PartNumber": "FW05681GTYNALT",
    "Description": "(Solar) (Green Tint) Acoustic Infrared Interlayer Collision Mitigation Braking System Forward Collision Alert Road Departure Mitigation System LDWS Adaptive Cruise Control Lane Keep Assist Traffic Jam Assist Traffic Sign Recognition",
    "WebsitePrice1_CanAm": "$211.70",
    "Availability": "In Stock",
    "Ships": "Immediately",
    "ShopPartPrice1_CanAm": null,
    "ShopPartPriceOveride": 0,
    "RainSensor": 1,
    "LaneDeparture": 0,
    "Acoustic": 0,
    "ElectrochromaticMirror": 0,
    "HeatedWiperPark": 1,
    "CondensationSensor": 1,
    "HeatedWindshield": 1,
    "HeadsupDispplay": 1,
    "ForwardCollisionAlert": 0,
    "Logo": 0,
    "HumiditySensor": 1,
    "ShopPriceList2_VanFax": null,
    "ShopPriceList3_Benson": null,
    "ShopPriceList4_PGW": null
  }
]
```
## Import Identifiers
<a name="import"></a>

`npm run importIdentifiers`

Download identifiers for all rows to `tmp/productionIds.csv` in order to compare what we have scraped.

## Export CSV's
<a name="export"></a>

`npm run exportCsv`

This will generate CSV's: `partsToCreate.csv` and `partsToUpdate.csv`

## Upload
<a name="upload"></a>

`npm run upload`

Updates and Creates New Rows.