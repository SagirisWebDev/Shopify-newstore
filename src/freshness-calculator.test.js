import { describe, it, expect } from 'vitest';
import { calculateFreshness } from './freshness-calculator.js';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

describe('calculateFreshness', () => {
  describe('Just Roasted band (0–7 days)', () => {
    it('labels day 0 (roasted today) as Just Roasted', () => {
      const today = new Date();
      const result = calculateFreshness(today, today);
      expect(result.daysSinceRoast).toBe(0);
      expect(result.freshnessLabel).toBe('Just Roasted');
    });

    it('labels day 7 as Just Roasted (upper boundary)', () => {
      const result = calculateFreshness(daysAgo(7));
      expect(result.daysSinceRoast).toBe(7);
      expect(result.freshnessLabel).toBe('Just Roasted');
    });
  });

  describe('Peak band (8–21 days)', () => {
    it('labels day 8 as Peak (lower boundary)', () => {
      const result = calculateFreshness(daysAgo(8));
      expect(result.daysSinceRoast).toBe(8);
      expect(result.freshnessLabel).toBe('Peak');
    });

    it('labels day 21 as Peak (upper boundary)', () => {
      const result = calculateFreshness(daysAgo(21));
      expect(result.daysSinceRoast).toBe(21);
      expect(result.freshnessLabel).toBe('Peak');
    });
  });

  describe('Past Peak band (22+ days)', () => {
    it('labels day 22 as Past Peak (lower boundary)', () => {
      const result = calculateFreshness(daysAgo(22));
      expect(result.daysSinceRoast).toBe(22);
      expect(result.freshnessLabel).toBe('Past Peak');
    });

    it('labels day 60 as Past Peak', () => {
      const result = calculateFreshness(daysAgo(60));
      expect(result.daysSinceRoast).toBe(60);
      expect(result.freshnessLabel).toBe('Past Peak');
    });
  });

  describe('error handling', () => {
    it('throws when roastDate is missing', () => {
      expect(() => calculateFreshness(null)).toThrow('roastDate is required');
      expect(() => calculateFreshness(undefined)).toThrow('roastDate is required');
    });

    it('throws when roastDate is in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(() => calculateFreshness(tomorrow)).toThrow('roastDate is in the future');
    });
  });

  describe('input formats', () => {
    it('accepts an ISO date string', () => {
      const result = calculateFreshness(daysAgo(10).toISOString());
      expect(result.freshnessLabel).toBe('Peak');
    });
  });
});
