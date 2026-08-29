/**
 * Every number the score depends on, in one place.
 *
 * These are calibration, not physics. They were chosen before anyone took the
 * test and will be wrong until real answers say otherwise — which is exactly
 * why they live here instead of scattered through the scorer. Changing one is
 * a decision to record, so `SCORING_VERSION` moves with it and an old result
 * stays traceable to the rules that produced it.
 */

export const SCORING_VERSION = 'iq-2026-08b';

/**
 * Where the scale starts before any item is answered.
 *
 * NOT an IQ of 100. This is NURA's own points scale, and the distinction is
 * the whole reason the result screen never prints "IQ": an IQ score is a
 * normalised position in a standardisation sample, and no such sample exists
 * here. Calling a raw total an IQ would be inventing the part that makes it
 * one.
 */
export const BASE = 105;

/**
 * What a correct answer is worth, by the item's difficulty.
 *
 * Superlinear on purpose: solving a difficulty-5 matrix says more than
 * solving five difficulty-1 ones, and a flat weight would let volume of easy
 * items drown the signal from the hard end.
 */
export const WEIGHT_BY_DIFFICULTY: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.0,
  2: 1.4,
  3: 1.9,
  4: 2.5,
  5: 3.2,
};

/**
 * The speed multiplier, and its deliberately narrow range.
 *
 * Faster is worth a little because working quickly is part of what these tasks
 * measure — but only a little. A wide range would let someone rush past the
 * hard items and be rewarded for it, and would punish a careful person who is
 * right more often. The band is tight enough that accuracy always dominates.
 */
export const SPEED = {
  min: 0.95,
  max: 1.05,
  /** Total time at which the multiplier is exactly 1.0. */
  neutralMs: 18 * 60 * 1000,
  /** Faster than this earns the full bonus; slower than the far end, none. */
  fastMs: 10 * 60 * 1000,
  slowMs: 30 * 60 * 1000,
} as const;

/**
 * How many completed runs NURA needs before it may report a percentile.
 *
 * Below this the distribution is noise, and a percentile computed from it
 * would be a number that looks like a measurement. Above it, the comparison is
 * to people who took THIS test — which is what the result says, rather than to
 * a general population NURA has never sampled.
 */
export const MIN_SAMPLE_FOR_PERCENTILE = 300;
