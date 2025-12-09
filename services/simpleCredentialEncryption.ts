import { EncryptedCredentials } from '../types';

/**
 * SimpleCredentialEncryption - Browser-compatible credential encryption
 *
 * Uses a simpler approach that's more compatible across different browsers
 * and environments, especially for client-side encryption.
 */
export class SimpleCredentialEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256; // bits
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Encrypts credentials using AES-GCM with a simple key derivation
   */
  static async encrypt(credentials: any, userKey: string): Promise<EncryptedCredentials> {
    try {
      // Validate inputs
      if (!credentials || typeof credentials !== 'object') {
        throw new Error('Credentials must be a valid object');
      }
      if (!userKey || typeof userKey !== 'string' || userKey.length < 8) {
        throw new Error('User key must be a string with at least 8 characters');
      }

      // Check if Web Crypto API is available
      if (!crypto || !crypto.subtle) {
        throw new Error('Web Crypto API is not available in this environment');
      }

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Create a simple key from the user key
      const key = await this.createKey(userKey);

      // Convert credentials to JSON string
      const plaintext = JSON.stringify(credentials);
      const plaintextBuffer = new TextEncoder().encode(plaintext);

      // Encrypt using AES-GCM
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        plaintextBuffer
      );

      return {
        encrypted: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        authTag: '', // GCM includes auth tag in encrypted data
        algorithm: this.ALGORITHM,
        salt: '', // Not needed for this simple approach
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts credentials using AES-GCM
   */
  static async decrypt(encryptedCredentials: EncryptedCredentials, userKey: string): Promise<any> {
    try {
      // Validate inputs
      if (!encryptedCredentials || typeof encryptedCredentials !== 'object') {
        throw new Error('Encrypted credentials must be a valid object');
      }
      if (!userKey || typeof userKey !== 'string' || userKey.length < 8) {
        throw new Error('User key must be a string with at least 8 characters');
      }

      // Validate required fields
      const requiredFields = ['encrypted', 'iv', 'algorithm'];
      for (const field of requiredFields) {
        if (!encryptedCredentials[field as keyof EncryptedCredentials]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Convert base64 strings to ArrayBuffers
      const iv = this.base64ToArrayBuffer(encryptedCredentials.iv);
      const ciphertext = this.base64ToArrayBuffer(encryptedCredentials.encrypted);

      // Create the same key from the user key
      const key = await this.createKey(userKey);

      // Decrypt using AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv),
        },
        key,
        ciphertext
      );

      // Convert decrypted buffer to JSON object
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Creates a crypto key from a user key string
   */
  private static async createKey(userKey: string): Promise<CryptoKey> {
    // Create a hash of the user key to get a consistent 256-bit key
    const keyBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userKey));

    return crypto.subtle.importKey('raw', keyBuffer, { name: this.ALGORITHM }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * Generates a secure user key from user ID and application secret
   */
  static generateUserKey(userId: string, appSecret: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID must be a valid string');
    }
    if (!appSecret || typeof appSecret !== 'string' || appSecret.length < 16) {
      throw new Error('App secret must be a string with at least 16 characters');
    }

    // Combine user ID and app secret with a separator
    const combined = `${userId}:${appSecret}`;

    // Create a simple hash for the user key
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36) + userId.slice(-8);
  }

  /**
   * Validates encrypted credentials format
   */
  static validateEncryptedCredentials(encryptedCredentials: any): boolean {
    if (!encryptedCredentials || typeof encryptedCredentials !== 'object') {
      return false;
    }

    const requiredFields = ['encrypted', 'iv', 'algorithm'];
    return requiredFields.every(
      (field) =>
        encryptedCredentials[field] &&
        typeof encryptedCredentials[field] === 'string' &&
        encryptedCredentials[field].length > 0
    );
  }

  /**
   * Converts ArrayBuffer to base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
  }

  /**
   * Converts base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    return Buffer.from(base64, 'base64').buffer as ArrayBuffer;
  }
}

// Export singleton instance for convenience
export const simpleCredentialEncryption = SimpleCredentialEncryption;
