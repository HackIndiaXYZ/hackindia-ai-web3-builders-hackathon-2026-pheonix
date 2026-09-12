// Utility functions for TitleLock Explorer

/**
 * Format numbers as Indian Rupee (INR)
 * @param {number} amount 
 * @returns {string} e.g. "₹75,00,000"
 */
export function formatCurrencyINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ISO dates into human readable strings
 * @param {string} dateStr 
 * @returns {string} e.g. "15 Mar 2022"
 */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format area in square meters with locale formatting
 * @param {number} sqm 
 * @returns {string} e.g. "1,200 m²"
 */
export function formatArea(sqm) {
  if (sqm === undefined || sqm === null || isNaN(sqm)) return "—";
  return `${Number(sqm).toLocaleString("en-IN")} m²`;
}

/**
 * Calculate simple centroid of a 2D polygon if not provided
 * @param {Array<[number, number]>} coords 
 * @returns {{lat: number, lng: number}}
 */
export function calculateCentroid(coords) {
  if (!coords || coords.length === 0) return { lat: 28.4744, lng: 77.504 };
  let sumLng = 0;
  let sumLat = 0;
  coords.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });
  return {
    lng: sumLng / coords.length,
    lat: sumLat / coords.length,
  };
}

/**
 * Truncate long hash or document reference
 * @param {string} str 
 * @param {number} len 
 * @returns {string}
 */
export function truncateHash(str, len = 12) {
  if (!str) return "—";
  if (str.length <= len) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}
