import { jest } from '@jest/globals';
import { withRetry, getYearRange, constructPart, countParts } from '../utils';

jest.useFakeTimers();
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(global, 'setTimeout').mockImplementation(fn => fn());

describe('withRetry', () => {
  it('resolves on first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    await expect(withRetry(fn)).resolves.toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to limit and succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    await expect(withRetry(fn, 3)).resolves.toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('fails after all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(fn, 3)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('getYearRange', () => {
  it('returns correct range', () => {
    expect(getYearRange(2000, 2002)).toEqual([2000, 2001, 2002]);
  });
});

describe('constructPart', () => {
  it('sets matching feature flags to 0 and others to 1, and cleans price', () => {
    const input = {
      Description: '(Solar) Acoustic Heated Forward Collision Lane Rain',
      WebsitePrice1_CanAm: '$123.45',
      RainSensor: 0,
      LaneDeparture: 0,
      Acoustic: 0,
      HeatedWiperPark: 0,
      CondensationSensor: 0,
      HeatedWindshield: 0,
      HeadsupDispplay: 0,
      ForwardCollisionAlert: 0,
      HumiditySensor: 0
    };

    const output = constructPart(input);

    expect(output.RainSensor).toBe(0);
    expect(output.LaneDeparture).toBe(0);
    expect(output.Acoustic).toBe(0);
    expect(output.HeatedWindshield).toBe(0);
    expect(output.ForwardCollisionAlert).toBe(0);
    expect(output.CondensationSensor).toBe(1);
    expect(output.HeatedWiperPark).toBe(1);
    expect(output.HeadsupDispplay).toBe(1);
    expect(output.HumiditySensor).toBe(1);
    expect(output.WebsitePrice1_CanAm).toBe('123.45');
  });
});