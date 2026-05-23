const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Fetch secrets from process.env with strong default fallbacks for local dev
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_jwt_super_secret_key_102938';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32)
  : crypto.scryptSync('enterprise_encryption_default_passphrase_key', 'salt', 32);

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

class SecurityService {
  /**
   * Encrypt data using AES-256-CBC
   */
  encrypt(data) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      
      let inputData = data;
      if (typeof data === 'object') {
        inputData = JSON.stringify(data);
      } else if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
        inputData = String(data);
      }

      let encrypted = cipher.update(inputData);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Return IV and ciphertext combined as hex string: "iv_hex:ciphertext_hex"
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt AES-256-CBC encrypted data
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText || !encryptedText.includes(':')) {
        throw new Error('Invalid encrypted format');
      }

      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedTextBuffer = Buffer.from(textParts.join(':'), 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedTextBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const decryptedStr = decrypted.toString();
      try {
        // Attempt to parse JSON if it is a JSON string
        return JSON.parse(decryptedStr);
      } catch {
        return decryptedStr;
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * JWT Generation
   */
  generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  /**
   * JWT Verification
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.warn('JWT Verification failed:', error.message);
      return null;
    }
  }

  /**
   * Mock Malware Scanner
   * Checks file buffer & name against common test malware signatures and keywords
   */
  scanForMalware(buffer, filename = '') {
    if (!buffer) {
      return { clean: true };
    }

    const contentStr = buffer.toString('utf8');
    const nameLower = filename.toLowerCase();

    // Check for EICAR Standard Antivirus Test File signature
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    
    if (contentStr.includes(eicarSignature)) {
      return {
        clean: false,
        reason: 'Infected: EICAR Standard Antivirus Test File signature detected.'
      };
    }

    // Check for obvious malicious keywords in test names or files
    const maliciousKeywords = ['malware.exe', 'trojan.dmg', 'ransomware', 'eicar.com'];
    for (const kw of maliciousKeywords) {
      if (nameLower.includes(kw) || contentStr.includes(kw)) {
        return {
          clean: false,
          reason: `Suspicious activity: File contains reference to '${kw}' indicating potential threat.`
        };
      }
    }

    // In a real enterprise system, we would integrate ClamAV or a third party scanning API.
    return { clean: true };
  }
}

module.exports = new SecurityService();
