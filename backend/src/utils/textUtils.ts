/**
 * Converts Eastern Arabic-Indic numerals (٠-٩) to standard English numerals (0-9).
 * Crucial for Saudi user inputs where mobile keyboards often output Arabic digits.
 * 
 * @param text - The input string containing Arabic or English digits.
 * @returns - The string with all digits normalized to 0-9.
 */
export const convertArabicDigitsToEnglish = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[٠-٩]/g, d => (d.charCodeAt(0) - 1632).toString());
};

/**
 * Normalizes an Arabic string to handle common spelling discrepancies.
 * - Removes diacritics (Tashkeel) and Tatweel/Kashida (ـ).
 * - Unifies Alif forms (أ, إ, آ, ٱ) to bare Alif (ا).
 * - Unifies Teh Marbuta (ة) to Heh (ه).
 * - Unifies Alef Maksura (ى) to Yeh (ي).
 * - Removes extra spaces and trims.
 * 
 * @param text - The input Arabic text.
 * @returns - The normalized text.
 */
export const normalizeArabicName = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    // 1. Remove diacritics (Tashkeel) and Tatweel / Kashida (ـ)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // 2. Unify Alif forms (أ, إ, آ, ٱ)
    .replace(/[أإآٱ]/g, 'ا')
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
 * - Supports both English (0-9) and Arabic-Indic (٠-٩) numerals.
 */
export const isValidSaudiId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  const normalizedId = convertArabicDigitsToEnglish(id.trim());
  return /^[12]\d{9}$/.test(normalizedId);
};

