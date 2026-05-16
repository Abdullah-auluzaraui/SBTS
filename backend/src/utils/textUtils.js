/**
 * Normalizes an Arabic string to handle common spelling discrepancies.
 * - Removes diacritics (Tashkeel).
 * - Unifies Alif (أ, إ, آ) to bare Alif (ا).
 * - Unifies Teh Marbuta (ة) to Heh (ه).
 * - Unifies Alef Maksura (ى) to Yeh (ي).
 * - Removes extra spaces.
 * 
 * @param {string} text - The input Arabic text.
 * @returns {string} - The normalized text.
 */
const normalizeArabicName = (text) => {
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
    // 5. Remove non-Arabic, non-space characters (optional, but good for names)
    // .replace(/[^\u0600-\u06FF\s]/g, '')
    // 6. Remove extra whitespace and trim
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  normalizeArabicName
};
