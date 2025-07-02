# CAN-AM Parts Scraper{#home}
1. [Clean](#clean)
2. [Populate](#populate)
3. [Scrape](#scrape)
4. [Import](#import)
## Clean{#clean} 
[*Back to Top*](#home)

`npm run clean`

Delete Duplicate parts while keeping the latest row, and normalize keys ensuring no stray spaces or case mismatches cause false negatives during joins.
## Populate{#populate}
[*Back to Top*](#home)

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
## Scrape{#scrape}
[*Back to Top*](#home)

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
## Import{#import} 
[*Back to Top*](#home)

`npm run import`

Download identifiers for all rows to a csv in order to compare what we have scraped.
```
SELECT 
COALESCE("BodyHref", "ModelHref") || '--' || "PartNumber" AS constructed_id
FROM public.canam_parts;
```
Save this to `tmp/productionIds.csv`

## Export {#export}
[*Back to Top*](#home)

`npm run export`

This will generate CSV's: `partsToCreate.csv` and `partsToUpdate.csv`

## Upload