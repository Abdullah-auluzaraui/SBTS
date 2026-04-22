const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a3f9b2c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

// Ensure the key is exactly 32 bytes
let keyBuffer;
if (ENCRYPTION_KEY.length === 64) {
  keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex'); // 64 hex chars = 32 bytes
} else {
  keyBuffer = Buffer.from(ENCRYPTION_KEY); // Default utf8
  if (keyBuffer.length !== 32) {
    // Fallback: hash the key to ensure it is exactly 32 bytes long for AES-256
    keyBuffer = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  }
}

/**
 * Encrypts a text string.
 * @param {string} text - The text to encrypt.
 * @returns {string} - The encrypted text in the format iv:encryptedData
 */
const encrypt = (text) => {
  if (!text) return text;
  
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return iv and encrypted data, joined by a colon
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypts an encrypted text string.
 * @param {string} text - The encrypted text in the format iv:encryptedData
 * @returns {string} - The decrypted original text
 */
const decrypt = (text) => {
  if (!text) return text;
  
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};

/**
 * Masks a string, keeping only the last 4 characters visible.
 * Useful for displaying National IDs partially.
 * @param {string} text - The original text.
 * @returns {string} - The masked text (e.g., ******1234)
 */
const maskData = (text) => {
  if (!text) return text;
  const visibleChars = 4;
  if (text.length <= visibleChars) return text;
  
  const maskedSection = '*'.repeat(text.length - visibleChars);
  const visibleSection = text.slice(-visibleChars);
  
  return maskedSection + visibleSection;
};

module.exports = {
  encrypt,
  decrypt,
  maskData
};
