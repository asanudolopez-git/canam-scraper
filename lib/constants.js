export const YEAR_1 = 2000;
export const CANAM_BASE_URL = 'https://www.canamautoglass.ca/nags/';
export const PART_NUMBER_REGEX = /^(FW|DW)/;
export const PART_DESCRIPTION_REGEX = {
  RainSensor: new RegExp('Rain', 'i'),
  LaneDeparture: new RegExp('Lane', 'i'),
  Acoustic: new RegExp('Acoustic', 'i'),
  HeatedWiperPark: new RegExp('Wiper', 'i'),
  CondensationSensor: new RegExp('Condensation', 'i'),
  HeatedWindshield: new RegExp('Heated', 'i'),
  HeadsupDispplay: new RegExp('HUD', 'i'),
  ForwardCollisionAlert: new RegExp('Forward Collision', 'i'),
  HumiditySensor: new RegExp('Humidity', 'i')
};
export const PARTS_TEMPLATE = {
  Year: '',
  YearHref: '',
  Make: '',
  MakeHref: '',
  Model: '',
  ModelHref: '',
  Body: '',
  BodyHref: '',
  PartNumber: '',
  Description: '',
  WebsitePrice1_CanAm: '',
  Availability: '',
  Ships: '',
  ShopPartPrice1_CanAm: null,
  ShopPartPriceOveride: 0,
  RainSensor: 0,
  LaneDeparture: 0,
  Acoustic: 0,
  ElectrochromaticMirror: 0,
  HeatedWiperPark: 0,
  CondensationSensor: 0,
  HeatedWindshield: 0,
  HeadsupDispplay: 0,
  ForwardCollisionAlert: 0,
  Logo: 0,
  HumiditySensor: 0,
  ShopPriceList2_VanFax: null,
  ShopPriceList3_Benson: null,
  ShopPriceList4_PGW: null,
};