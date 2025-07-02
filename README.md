# CAN-AM Parts Scraper

## Populate Links to be scraped

Populate all of the hrefs by year, make, model, and body style. These are the hrefs for every vehicle.
  * Note, this should ideally only be run on the latest year, since there won't be new vehicle types before the current year.

```
const hrefs = JSON.parse(fs.readFileSync(config.hrefsFileName, 'utf8'));
populateVehicleHrefs(hrefs, { start: getCurrentYear() }) 
```

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
And also `fixtures/populateVehiclesByYear.json` with e.g:
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

## Populate Links to be scraped