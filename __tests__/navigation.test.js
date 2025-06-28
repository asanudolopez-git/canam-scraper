import { jest } from '@jest/globals';
// __tests__/scraper-utils.test.js
import { JSDOM } from 'jsdom';
import {
  getPartsFromVehicleHref,
  getBodyStyleHrefsForModel,
  getModelHrefsForMake,
  getMakeHrefsForYear,
  getHrefsForYears
} from '../navigation';

jest.useFakeTimers();
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

const mockGoto = jest.fn();
const mockEvaluate = jest.fn();
// const mockEvaluate = async fn => html => {
//   const dom = new JSDOM(html, { runScripts: "dangerously" });
//   global.window = dom.window
//   global.document = dom.window.document
//   fn();
// };
const mockPage = {
  goto: mockGoto,
  evaluate: mockEvaluate,
  $: jest.fn(),
  $$: jest.fn()
};

const documentOg = global.document;
const windowOg = global.window;

const mockDom = async html => {
  const dom = new JSDOM(html);
  global.window = dom.window
  global.document = dom.window.document
  return Promise.resolve(dom);
};

afterEach(() => {
  global.window = documentOg;
  global.document = windowOg;
});

describe.only('getBodyStyleHrefsForModel', () => {
  const html = `
    <div class="list-group">
      <a class="list-group-item nagsPill" href="/car1">Car One</a>
      <a class="list-group-item nagsPill" href="/car2">Car Two</a>
    </div>`;
  it('parses hrefs correctly', async () => {
    mockEvaluate.mockImplementation(async fn => {
      const dom = new JSDOM(html);
      global.window = dom.window
      global.document = dom.window.document

      console.log('TEST dom.documentElement.innerHTML: ', dom.window.document.documentElement.innerHTML);
      console.log('TEST global.document.documentElement.innerHTML: ', global.document.documentElement.innerHTML);
      console.log('TEST document.documentElement.innerHTML: ', document.documentElement.innerHTML);
      console.log('TEST window.document.documentElement.innerHTML: ', window.document.documentElement.innerHTML);

      return await fn();
    });

    const result = await getBodyStyleHrefsForModel(mockPage);
    expect(result).toEqual({
      'Car One': { href: '/car1' },
      'Car Two': { href: '/car2' }
    });
  });

});

describe('getModelHrefsForMake', () => {
  it('handles models with bodyStyles', async () => {
    mockPage.goto.mockResolvedValue();
    mockPage.evaluate.mockResolvedValue({
      'ModelX': { href: '/modelX' },
      'ModelY': { href: '/modelY' }
    });
    const bodyStyleMock = jest.fn().mockResolvedValue({ StyleA: { href: '/sA' } });
    getBodyStyleHrefsForModel = bodyStyleMock;
    const result = await getModelHrefsForMake(mockPage);
    expect(result['ModelX'].bodyStyles).toEqual({ StyleA: { href: '/sA' } });
    expect(console.log).toHaveBeenCalledWith('Processing model: ModelX...');
  });
});
describe('getMakeHrefsForYear', () => {
  it('handles makes with models', async () => {
    mockPage.goto.mockResolvedValue();
    mockPage.evaluate.mockResolvedValue({
      'MakeA': { href: '/makeA' }
    });
    const modelMock = jest.fn().mockResolvedValue({ ModelA: { href: '/mA', bodyStyles: {} } });
    getModelHrefsForMake = modelMock;
    const result = await getMakeHrefsForYear(mockPage);
    expect(result['MakeA'].models).toHaveProperty('ModelA');
    expect(console.log).toHaveBeenCalledWith('Processing make: MakeA...');
  });
});
describe('getHrefsForYears', () => {
  it('parses years range and hrefs', async () => {
    mockPage.goto.mockResolvedValue();
    const mockMake = jest.fn().mockResolvedValue({ Make1: { href: '/m1', models: {} } });
    getMakeHrefsForYear = mockMake;
    const hrefs = await getHrefsForYears(2023, 2023, mockPage, {});
    expect(hrefs[2023].makes).toHaveProperty('Make1');
    expect(console.log).toHaveBeenCalledWith('Processing year: 2023...');
  });
});
describe('getPartsFromVehicleHref', () => {
  it('extracts valid part rows from page', async () => {
    const fakeRow = {
      $eval: jest.fn()
        .mockResolvedValueOnce('FW1234')  // part number
        .mockResolvedValueOnce('Some description')
        .mockResolvedValueOnce('123.45 MSRP')
        .mockResolvedValueOnce('In Stock')
        .mockResolvedValueOnce('Ships Today')
    };
    mockPage.goto.mockResolvedValue();
    mockPage.$$.mockResolvedValue([fakeRow]);

    const result = await getPartsFromVehicleHref(mockPage, 'http://example.com/vehicle');
    expect(result).toEqual([
      {
        PartNumber: 'FW1234',
        Description: 'Some description',
        WebsitePrice1_CanAm: '123.45',
        Availability: 'In Stock',
        Ships: 'Ships Today'
      }
    ]);
  });
});
