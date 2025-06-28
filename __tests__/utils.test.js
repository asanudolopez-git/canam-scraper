import { jest } from '@jest/globals';
import { withRetry, getYearRange } from '../utils';

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