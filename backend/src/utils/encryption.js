const crypto = require("crypto");
const { ApiError } = require("./apiError");

function getEncryptionKey() {
  const encodedKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY || "";
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new ApiError(
      503,
      "Gmail token encryption is not configured correctly",
      "GMAIL_NOT_CONFIGURED",
      {
        missing: encodedKey ? [] : ["GMAIL_TOKEN_ENCRYPTION_KEY"],
        invalid: encodedKey ? ["GMAIL_TOKEN_ENCRYPTION_KEY"] : [],
        expectedFormat: "Base64-encoded 32-byte key",
      },
    );
  }
  return key;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptSecret(payload) {
  const [ivValue, tagValue, encryptedValue] = String(payload).split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new ApiError(500, "Stored Gmail credentials are invalid", "GMAIL_TOKEN_INVALID");
  }
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ApiError(500, "Stored Gmail credentials cannot be decrypted", "GMAIL_TOKEN_INVALID");
  }
}

module.exports = { decryptSecret, encryptSecret };
