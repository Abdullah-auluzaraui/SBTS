import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'defaultkey32byteslongdefaultkey32bytes';

const IV_LENGTH = 16; // For AES, this is always 16

// Ensure the key is exactly 32 bytes
let keyBuffer: Buffer;
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
 * @param text - The text to encrypt.
 * @returns - The encrypted text in the format iv:encryptedData
 */
export const encrypt = (text: string): string => {
  if (!text) return text;
  
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return iv and encrypted data, joined by a colon
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypts an encrypted text string.
 * @param text - The encrypted text in the format iv:encryptedData
 * @returns - The decrypted original text
 */
export const decrypt = (text: string): string => {
  if (!text) return text;
  
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error decrypting data:', error);
    return '';
  }
};

/**
 * Masks a string, keeping only the last 4 characters visible.
 * Useful for displaying National IDs partially.
 * @param text - The original text.
 * @returns - The masked text (e.g., ******1234)
 */
export const maskData = (text: string): string => {
  if (!text) return text;
  const visibleChars = 4;
  if (text.length <= visibleChars) return text;
  
  const maskedSection = '*'.repeat(text.length - visibleChars);
  const visibleSection = text.slice(-visibleChars);
  
  return maskedSection + visibleSection;
};
