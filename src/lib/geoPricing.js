// -----------------------------------------------------------------------------
// Al-Meyar — geo pricing. Base currency is USD; convert + format per region.
// Only two currencies are supported: SAR (Saudi Arabia) and USD (United States).
// -----------------------------------------------------------------------------

/**
 * Supported regions in display order: SA, US.
 * rate = USD -> local currency multiplier.
 * @type {Array<{
 *   code: string, country: string, currency: string, symbol: string,
 *   rate: number, flag: string
 * }>}
 */
export const REGIONS = [
  {
    code: "SA",
    country: "Saudi Arabia",
    currency: "SAR",
    symbol: "SR",
    rate: 3.75,
    flag: "🇸🇦",
  },
  {
    code: "US",
    country: "United States",
    currency: "USD",
    symbol: "$",
    rate: 1,
    flag: "🇺🇸",
  },
];

/** Internal: resolve a region by code, falling back to the first (SA). */
function resolveRegion(regionCode) {
  return REGIONS.find((r) => r.code === regionCode) || REGIONS[0];
}

/**
 * Convert a USD base price into the region's local currency value.
 * @param {number} baseUSD
 * @param {string} regionCode
 * @returns {number}
 */
export function convert(baseUSD, regionCode) {
  const region = resolveRegion(regionCode);
  const value = Number(baseUSD) || 0;
  return value * region.rate;
}

/**
 * Format a USD base price as a currency string for the region:
 * symbol + " " + number grouped with 2 decimals (en-US grouping).
 * Unknown code falls back to SA.
 * @param {number} baseUSD
 * @param {string} regionCode
 * @returns {string}
 */
export function formatPrice(baseUSD, regionCode) {
  const region = resolveRegion(regionCode);
  const amount = convert(baseUSD, regionCode);

  const number = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${region.symbol} ${number}`;
}
