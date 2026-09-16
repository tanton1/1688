import crypto from "node:crypto";
import { ENV } from "../config/env.js";

interface OAuthStatePayload {
  userId: string;
  nonce: string;
  expiresAt: number;
}

const encode = (value: string | Buffer): string => Buffer.from(value).toString("base64url");
const decode = (value: string): Buffer => Buffer.from(value, "base64url");

export class ChannelCryptoService {
  public isConfigured(): boolean {
    return ENV.CHANNEL_TOKEN_ENCRYPTION_KEY.trim().length >= 32;
  }

  private key(): Buffer {
    if (!this.isConfigured()) {
      throw new Error("CHANNEL_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
    }
    return crypto.createHash("sha256").update(ENV.CHANNEL_TOKEN_ENCRYPTION_KEY).digest();
  }

  public encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${encode(iv)}.${encode(tag)}.${encode(encrypted)}`;
  }

  public decrypt(cipherText: string): string {
    const [version, ivPart, tagPart, encryptedPart] = cipherText.split(".");
    if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) {
      throw new Error("INVALID_CHANNEL_CIPHERTEXT");
    }
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key(), decode(ivPart));
    decipher.setAuthTag(decode(tagPart));
    return Buffer.concat([decipher.update(decode(encryptedPart)), decipher.final()]).toString("utf8");
  }

  public createOAuthState(userId: string, ttlSeconds = 10 * 60): string {
    const payload: OAuthStatePayload = {
      userId,
      nonce: crypto.randomBytes(16).toString("hex"),
      expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds
    };
    const encodedPayload = encode(JSON.stringify(payload));
    const signature = crypto.createHmac("sha256", this.key()).update(encodedPayload).digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  public verifyOAuthState(state: string): OAuthStatePayload {
    const [encodedPayload, suppliedSignature] = state.split(".");
    if (!encodedPayload || !suppliedSignature) throw new Error("INVALID_OAUTH_STATE");
    const expectedSignature = crypto.createHmac("sha256", this.key()).update(encodedPayload).digest();
    const supplied = decode(suppliedSignature);
    if (supplied.length !== expectedSignature.length || !crypto.timingSafeEqual(supplied, expectedSignature)) {
      throw new Error("INVALID_OAUTH_STATE");
    }
    const payload = JSON.parse(decode(encodedPayload).toString("utf8")) as OAuthStatePayload;
    if (!payload.userId || !payload.nonce || payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new Error("EXPIRED_OAUTH_STATE");
    }
    return payload;
  }
}

export const channelCryptoService = new ChannelCryptoService();
