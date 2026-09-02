/**
 * Saudi National ID & Resident ID Validation Utility
 *
 * Rules:
 * - Exactly 10 numeric digits.
 * - Starts with 1 (Saudi Citizen / مواطن) or 2 (Resident / مقيم).
 */

export const isValidSaudiId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[12]\d{9}$/.test(id.trim());
};

/**
 * Sanitizes input to digits only, capped at 10 digits.
 */
export const sanitizeSaudiId = (val: string): string => {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 10);
};
