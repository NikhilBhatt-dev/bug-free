process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.GMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const mockOAuthClient = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  revokeCredentials: jest.fn(),
  setCredentials: jest.fn(),
};

jest.mock("../src/config/gmail", () => ({
  createGmailOAuthClient: jest.fn(() => mockOAuthClient),
  GMAIL_SEND_SCOPE: "https://www.googleapis.com/auth/gmail.send",
  getGmailConfigurationIssues: jest.fn(() => ({ missing: [], invalid: [] })),
  isGmailConfigured: jest.fn(() => true),
}));

jest.mock("../src/models", () => ({
  UserSettings: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const { UserSettings } = require("../src/models");
const {
  GMAIL_SEND_SCOPE,
  getGmailConfigurationIssues,
  isGmailConfigured,
} = require("../src/config/gmail");
const gmailService = require("../src/services/gmail.service");
const { decryptSecret, encryptSecret } = require("../src/utils/encryption");
const { ApiError } = require("../src/utils/apiError");

describe("Gmail OAuth service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isGmailConfigured.mockReturnValue(true);
    getGmailConfigurationIssues.mockReturnValue({ missing: [], invalid: [] });
    mockOAuthClient.getToken.mockReset();
    mockOAuthClient.generateAuthUrl.mockReset();
    mockOAuthClient.revokeCredentials.mockReset();
    mockOAuthClient.setCredentials.mockReset();
    UserSettings.updateOne.mockResolvedValue({ acknowledged: true });
  });

  it("generates an OAuth URL with only the Gmail send scope and offline access", () => {
    mockOAuthClient.generateAuthUrl.mockReturnValue(
      "https://accounts.google.test/authorize",
    );

    const url = gmailService.getAuthorizationUrl("state-value");

    expect(url).toBe("https://accounts.google.test/authorize");
    expect(mockOAuthClient.generateAuthUrl).toHaveBeenCalledWith({
      access_type: "offline",
      prompt: "consent",
      scope: [GMAIL_SEND_SCOPE],
      include_granted_scopes: false,
      state: "state-value",
    });
  });

  it("creates state bound to the authenticated user and rejects tampering", () => {
    const state = gmailService.createUserConnectionState("user-1");

    expect(gmailService.verifyConnectionState(state, "user-1")).toBe(true);
    expect(gmailService.verifyConnectionState(state, "user-2")).toBe(false);
    expect(
      gmailService.verifyConnectionState(`${state}tampered`, "user-1"),
    ).toBe(false);
  });

  it("stores only an encrypted refresh token after successful consent", async () => {
    mockOAuthClient.getToken.mockResolvedValue({
      tokens: {
        access_token: "access-token-secret",
        refresh_token: "refresh-token-secret",
      },
    });

    await gmailService.connectGmail("user-1", "authorization-code");

    const update = UserSettings.updateOne.mock.calls[0][1].$set;
    const encryptedToken =
      update["gmailConnection.encryptedRefreshToken"];
    expect(encryptedToken).not.toBe("refresh-token-secret");
    expect(decryptSecret(encryptedToken)).toBe("refresh-token-secret");
    expect(JSON.stringify(update)).not.toContain("access-token-secret");
    expect(update["gmailConnection.grantedScopes"]).toEqual([GMAIL_SEND_SCOPE]);
    expect(update["gmailConnection.email"]).toBeNull();
  });

  it("rejects a missing refresh token without changing connection settings", async () => {
    mockOAuthClient.getToken.mockResolvedValue({
      tokens: { access_token: "access-token-secret" },
    });

    await expect(
      gmailService.connectGmail("user-1", "authorization-code"),
    ).rejects.toMatchObject({ code: "GMAIL_REFRESH_TOKEN_MISSING" });
    expect(UserSettings.updateOne).not.toHaveBeenCalled();
  });

  it("normalizes token exchange errors without exposing provider details", async () => {
    mockOAuthClient.getToken.mockRejectedValue(
      new Error("provider response included a secret"),
    );

    await expect(
      gmailService.connectGmail("user-1", "authorization-code"),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "GMAIL_OAUTH_EXCHANGE_FAILED",
      message: "Google authorization could not be completed",
    });
    expect(UserSettings.updateOne).not.toHaveBeenCalled();
  });

  it("returns safe Gmail configuration details when sending is unconfigured", async () => {
    isGmailConfigured.mockReturnValue(false);
    getGmailConfigurationIssues.mockReturnValue({
      missing: ["GMAIL_CLIENT_ID"],
      invalid: ["GMAIL_TOKEN_ENCRYPTION_KEY"],
    });

    await expect(
      gmailService.sendEmail("user-1", {}, {}),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "GMAIL_NOT_CONFIGURED",
      details: {
        missing: ["GMAIL_CLIENT_ID"],
        invalid: ["GMAIL_TOKEN_ENCRYPTION_KEY"],
      },
    });
  });

  it("returns only public connection status fields", async () => {
    UserSettings.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        gmailConnection: {
          connected: true,
          connectedAt: new Date("2026-11-26T00:00:00.000Z"),
          email: null,
          grantedScopes: [GMAIL_SEND_SCOPE],
          encryptedRefreshToken: "encrypted-private-value",
        },
      }),
    });

    const status = await gmailService.getGmailConnection("user-1");

    expect(status).toEqual({
      connected: true,
      connectedAt: new Date("2026-11-26T00:00:00.000Z"),
      email: null,
      grantedScopes: [GMAIL_SEND_SCOPE],
    });
    expect(JSON.stringify(status)).not.toContain("encrypted-private-value");
  });

  it("revokes credentials and clears local connection data on disconnect", async () => {
    UserSettings.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        gmailConnection: {
          encryptedRefreshToken: encryptSecret("refresh-token-secret"),
        },
      }),
    });
    mockOAuthClient.revokeCredentials.mockResolvedValue(undefined);

    await gmailService.disconnectGmail("user-1");

    expect(mockOAuthClient.setCredentials).toHaveBeenCalledWith({
      refresh_token: "refresh-token-secret",
    });
    expect(mockOAuthClient.revokeCredentials).toHaveBeenCalled();
    expect(UserSettings.updateOne.mock.calls[0][1].$set).toMatchObject({
      "gmailConnection.connected": false,
      "gmailConnection.encryptedRefreshToken": null,
      "gmailConnection.grantedScopes": [],
    });
  });

  it("clears local credentials and reports Google revocation failures", async () => {
    UserSettings.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        gmailConnection: {
          encryptedRefreshToken: encryptSecret("refresh-token-secret"),
        },
      }),
    });
    mockOAuthClient.revokeCredentials.mockRejectedValue(
      new Error("provider error with token"),
    );

    await expect(gmailService.disconnectGmail("user-1")).rejects.toMatchObject({
      code: "GMAIL_REVOCATION_FAILED",
    });
    expect(UserSettings.updateOne).toHaveBeenCalled();
    expect(JSON.stringify(UserSettings.updateOne.mock.calls)).not.toContain(
      "refresh-token-secret",
    );
  });
});

describe("Gmail token encryption helper", () => {
  it("encrypts and decrypts secrets and rejects modified ciphertext", () => {
    const encrypted = encryptSecret("refresh-token-secret");

    expect(encrypted).not.toContain("refresh-token-secret");
    expect(decryptSecret(encrypted)).toBe("refresh-token-secret");

    const [iv, tag, ciphertext] = encrypted.split(".");
    const replacement = ciphertext[0] === "A" ? "B" : "A";
    const modified = `${iv}.${tag}.${replacement}${ciphertext.slice(1)}`;
    expect(() => decryptSecret(modified)).toThrow(ApiError);
  });
});
