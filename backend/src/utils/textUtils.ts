/**
 * Normalizes an Arabic string to handle common spelling discrepancies.
 * - Removes diacritics (Tashkeel).
 * - Unifies Alif (أ, إ, آ) to bare Alif (ا).
 * - Unifies Teh Marbuta (ة) to Heh (ه).
 * - Unifies Alef Maksura (ى) to Yeh (ي).
 * - Removes extra spaces.
 * 
 * @param text - The input Arabic text.
 * @returns - The normalized text.
 */
export const normalizeArabicName = (text: string): string => {
  if (!text) return '';

  return text
    // 1. Remove diacritics (Tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // 2. Unify Alif forms
    .replace(/[أإآ]/g, 'ا')
    // 3. Unify Teh Marbuta to Heh
    .replace(/ة/g, 'ه')
    // 4. Unify Alef Maksura to Yeh
    .replace(/ى/g, 'ي')
    // 5. Remove extra whitespace and trim
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Validates a Saudi National ID (مواطن) or Resident ID (مقيم).
 * Criteria:
 * - Exactly 10 digits.
 * - Starts with 1 (Saudi Citizen) or 2 (Resident).
 * - Numeric only.
 */
export const isValidSaudiId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[12]\d{9}$/.test(id.trim());
};
