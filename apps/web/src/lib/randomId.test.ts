import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomId } from './randomId';

/**
 * The fallback path is the one that matters: it only runs where
 * `crypto.randomUUID` is missing, which is precisely where nobody develops —
 * a phone opening the site over plain HTTP by LAN address. Without a test it
 * would stay unexercised until someone reported that the start button does
 * nothing on their device.
 */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomId', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns a v4 uuid where crypto.randomUUID exists', () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it('returns a v4 uuid where crypto.randomUUID is missing', () => {
    // An insecure context: getRandomValues is present, randomUUID is not.
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      undefined as unknown as typeof crypto.randomUUID,
    );
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });

    expect(randomId()).toMatch(UUID_V4);
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomId()));
    expect(ids.size).toBe(500);
  });
});
