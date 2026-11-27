const originalEnvironment = {
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
  GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY,
};

describe("Gmail OAuth configuration", () => {
  afterAll(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("creates the configured Gmail OAuth client without loading the broken API bundle", () => {
    process.env.GMAIL_CLIENT_ID = "test-client-id";
    process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
    process.env.GMAIL_REDIRECT_URI =
      "http://localhost:5000/api/gmail/callback";
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY =
      Buffer.alloc(32, 1).toString("base64");

    const {
      createGmailOAuthClient,
      GMAIL_SEND_SCOPE,
    } = require("../src/config/gmail");
    const client = createGmailOAuthClient();
    const authorizationUrl = new URL(
      client.generateAuthUrl({
        access_type: "offline",
        scope: [GMAIL_SEND_SCOPE],
        state: "test-state",
      }),
    );

    expect(authorizationUrl.searchParams.get("client_id")).toBe(
      "test-client-id",
    );
    expect(authorizationUrl.searchParams.get("scope")).toBe(GMAIL_SEND_SCOPE);
    expect(authorizationUrl.searchParams.get("state")).toBe("test-state");
  });

  it("reports missing Gmail variables by name without including their values", () => {
    process.env.GMAIL_CLIENT_ID = "";
    process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
    process.env.GMAIL_REDIRECT_URI =
      "http://localhost:5000/api/gmail/callback";
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "";

    const { getGmailConfigurationIssues, isGmailConfigured } =
      require("../src/config/gmail");
    const issues = getGmailConfigurationIssues();

    expect(issues).toEqual({
      missing: ["GMAIL_CLIENT_ID", "GMAIL_TOKEN_ENCRYPTION_KEY"],
      invalid: [],
    });
    expect(isGmailConfigured()).toBe(false);
    expect(JSON.stringify(issues)).not.toContain("test-client-secret");
  });

  it("rejects malformed Gmail redirect URLs and encryption keys", () => {
    process.env.GMAIL_CLIENT_ID = "test-client-id";
    process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
    process.env.GMAIL_REDIRECT_URI = "not-a-url";
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "not-base64";

    const { getGmailConfigurationIssues, isGmailConfigured } =
      require("../src/config/gmail");
    const issues = getGmailConfigurationIssues();

    expect(issues).toEqual({
      missing: [],
      invalid: ["GMAIL_REDIRECT_URI", "GMAIL_TOKEN_ENCRYPTION_KEY"],
    });
    expect(isGmailConfigured()).toBe(false);
  });
});
