const { validateEnvironment } = require("../src/config/env");
const { getAuthCookieOptions } = require("../src/utils/cookies");

const productionVariables = [
  "NODE_ENV",
  "MONGODB_URI",
  "JWT_SECRET",
  "FRONTEND_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REDIRECT_URI",
  "GMAIL_TOKEN_ENCRYPTION_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "COOKIE_SECURE",
  "COOKIE_SAME_SITE",
];
const originalEnvironment = Object.fromEntries(
  productionVariables.map((name) => [name, process.env[name]]),
);
const fixtureSecret =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function setValidProductionEnvironment() {
  Object.assign(process.env, {
    NODE_ENV: "production",
    MONGODB_URI: "mongodb+srv://db.example.test/jobpilot",
    JWT_SECRET: fixtureSecret,
    FRONTEND_URL: "https://app.example.test",
    GOOGLE_CLIENT_ID: "google-client-id-fixture",
    GOOGLE_CLIENT_SECRET: "google-client-secret-fixture",
    GOOGLE_CALLBACK_URL:
      "https://api.example.test/api/auth/google/callback",
    GMAIL_CLIENT_ID: "gmail-client-id-fixture",
    GMAIL_CLIENT_SECRET: "gmail-client-secret-fixture",
    GMAIL_REDIRECT_URI: "https://api.example.test/api/gmail/callback",
    GMAIL_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    CLOUDINARY_CLOUD_NAME: "cloud-fixture",
    CLOUDINARY_API_KEY: "cloud-api-key-fixture",
    CLOUDINARY_API_SECRET: "cloud-api-secret-fixture",
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "none",
  });
}

function restoreEnvironment() {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

describe("production environment validation", () => {
  beforeEach(setValidProductionEnvironment);
  afterEach(restoreEnvironment);

  it("accepts a complete secure production configuration", () => {
    expect(() => validateEnvironment()).not.toThrow();
  });

  it("rejects HTTP frontend and OAuth callback URLs by variable name", () => {
    process.env.FRONTEND_URL = "http://app.example.test";
    process.env.GOOGLE_CALLBACK_URL =
      "http://api.example.test/api/auth/google/callback";
    process.env.GMAIL_REDIRECT_URI =
      "http://api.example.test/api/gmail/callback";

    expect(() => validateEnvironment()).toThrow(
      /FRONTEND_URL.*GOOGLE_CALLBACK_URL.*GMAIL_REDIRECT_URI/,
    );
  });

  it("rejects missing and weak JWT secrets without exposing values", () => {
    process.env.JWT_SECRET = "short";
    expect(() => validateEnvironment()).toThrow(/JWT_SECRET/);

    process.env.JWT_SECRET =
      "example-placeholder-value-that-is-long-enough-to-look-plausible";
    expect(() => validateEnvironment()).toThrow(/JWT_SECRET/);

    delete process.env.JWT_SECRET;
    let message;
    try {
      validateEnvironment();
    } catch (error) {
      message = error.message;
    }

    expect(message).toMatch(/JWT_SECRET/);
    expect(message).not.toContain(fixtureSecret);
  });

  it("rejects insecure or invalid cookie settings", () => {
    process.env.COOKIE_SECURE = "false";
    process.env.COOKIE_SAME_SITE = "lax";

    expect(() => validateEnvironment()).toThrow(
      /COOKIE_SECURE.*COOKIE_SAME_SITE/,
    );
  });

  it("requires Cloudinary while CV upload routes are enabled", () => {
    delete process.env.CLOUDINARY_API_SECRET;

    expect(() => validateEnvironment()).toThrow(/CLOUDINARY_API_SECRET/);
  });

  it("leaves non-production local configuration validation unchanged", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    delete process.env.FRONTEND_URL;

    expect(() => validateEnvironment()).not.toThrow();
  });

  it("rejects an unspecified or unsupported NODE_ENV", () => {
    process.env.NODE_ENV = "staging";

    expect(() => validateEnvironment()).toThrow(/NODE_ENV/);
  });

  it("sets production auth cookies to HttpOnly, Secure, and SameSite=None", () => {
    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  });
});
