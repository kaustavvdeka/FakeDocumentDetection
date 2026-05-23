const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const securityService = require('./securityService');

// Local storage directory to mock IPFS pinning
const IPFS_STORE_DIR = path.join(__dirname, '../data/ipfs');

// Ensure directory exists
if (!fs.existsSync(IPFS_STORE_DIR)) {
  fs.mkdirSync(IPFS_STORE_DIR, { recursive: true });
}

class IpfsService {
  /**
   * Encrypts and writes data to the mock IPFS file store, returning a simulated CID.
   * @param {Buffer|string|object} data - Data to upload
   * @param {string} filename - Optional file name
   * @returns {Promise<{cid: string, size: number, encrypted: boolean}>}
   */
  async upload(data, filename = 'document.bin') {
    try {
      let contentBuffer;
      if (Buffer.isBuffer(data)) {
        contentBuffer = data;
      } else if (typeof data === 'object') {
        contentBuffer = Buffer.from(JSON.stringify(data));
      } else {
        contentBuffer = Buffer.from(String(data));
      }

      // 1. Run malware scan prior to encryption & upload
      const scanResult = securityService.scanForMalware(contentBuffer, filename);
      if (!scanResult.clean) {
        throw new Error(`Malware scan failed: ${scanResult.reason}`);
      }

      // 2. Encrypt the file content
      const encryptedData = securityService.encrypt(contentBuffer);

      // 3. Generate a mock CID (using SHA-256 hash of original content + Qm prefix)
      const hash = crypto.createHash('sha256').update(contentBuffer).digest('hex');
      // Create a base58-like string using the hash for a realistic IPFS CID (v0 format is Qm + 44 chars)
      const mockCid = 'Qm' + hash.slice(0, 44);

      const targetPath = path.join(IPFS_STORE_DIR, `${mockCid}.json`);
      
      const payload = {
        cid: mockCid,
        filename,
        encrypted: true,
        data: encryptedData,
        uploadedAt: new Date().toISOString(),
        sizeBytes: contentBuffer.length
      };

      fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2));

      return {
        cid: mockCid,
        size: contentBuffer.length,
        encrypted: true
      };
    } catch (error) {
      console.error('IPFS Upload failed:', error);
      throw error;
    }
  }

  /**
   * Retrieves and decrypts the file contents by CID.
   * @param {string} cid - The IPFS Content Identifier
   * @returns {Promise<{data: Buffer, filename: string, uploadedAt: string}>}
   */
  async cat(cid) {
    try {
      const targetPath = path.join(IPFS_STORE_DIR, `${cid}.json`);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`IPFS Object with CID ${cid} not found`);
      }

      const payload = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      
      // Decrypt data back to Buffer
      let decryptedData;
      if (payload.encrypted) {
        decryptedData = securityService.decrypt(payload.data);
      } else {
        decryptedData = payload.data;
      }

      let returnBuffer;
      if (typeof decryptedData === 'object' && decryptedData.type === 'Buffer') {
        returnBuffer = Buffer.from(decryptedData.data);
      } else if (typeof decryptedData === 'string') {
        returnBuffer = Buffer.from(decryptedData);
      } else {
        returnBuffer = Buffer.from(JSON.stringify(decryptedData));
      }

      return {
        data: returnBuffer,
        filename: payload.filename || 'document.bin',
        uploadedAt: payload.uploadedAt
      };
    } catch (error) {
      console.error(`IPFS Retrieve failed for CID ${cid}:`, error);
      throw error;
    }
  }
}

module.exports = new IpfsService();
