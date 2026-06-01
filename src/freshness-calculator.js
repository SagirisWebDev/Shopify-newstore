// Freshness bands (days since roast):
//   Just Roasted: 0–7
//   Peak:         8–21
//   Past Peak:    22+

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * @param {Date|string} roastDate
 * @param {Date} [today]
 * @returns {{ daysSinceRoast: number, freshnessLabel: 'Just Roasted' | 'Peak' | 'Past Peak' }}
 */
export function calculateFreshness(roastDate, today = new Date()) {
  if (!roastDate) throw new Error('roastDate is required');

  const roast = roastDate instanceof Date ? roastDate : new Date(roastDate);
  if (isNaN(roast.getTime())) throw new Error('roastDate is invalid');

  const daysSinceRoast = Math.floor((today - roast) / MS_PER_DAY);

  if (daysSinceRoast < 0) throw new Error('roastDate is in the future');

  let freshnessLabel;
  if (daysSinceRoast <= 7) {
    freshnessLabel = 'Just Roasted';
  } else if (daysSinceRoast <= 21) {
    freshnessLabel = 'Peak';
  } else {
    freshnessLabel = 'Past Peak';
  }

  return { daysSinceRoast, freshnessLabel };
}
