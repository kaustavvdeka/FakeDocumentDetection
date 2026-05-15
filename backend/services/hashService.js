const crypto = require("crypto");

class HashService {
  generateHash(fileBuffer) {
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  toBytes32(hexHash) {
    const cleanHash = hexHash.startsWith("0x") ? hexHash.slice(2) : hexHash;
    return "0x" + cleanHash;
  }

  generateDocumentHash(fileBuffer) {
    const hexHash = this.generateHash(fileBuffer);
    return { hexHash, bytes32Hash: this.toBytes32(hexHash) };
  }

  verifyHash(fileBuffer, knownHash) {
    const currentHash = this.generateHash(fileBuffer);
    const cleanKnown = knownHash.startsWith("0x") ? knownHash.slice(2) : knownHash;
    return currentHash === cleanKnown;
  }
}

module.exports = new HashService();
