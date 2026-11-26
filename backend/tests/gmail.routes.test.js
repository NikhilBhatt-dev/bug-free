process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.FRONTEND_URL = "http://localhost:3000,https://other.example";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { ApiError } = require("../src/utils/apiError");
const { signAccessToken } = require("../src/utils/jwt");
const gmailService = require("../src/services/gmail.service");

jest.mock("../src/services/gmail.service", () => ({
  connectGmail: jest.fn(),
  createConnectionState: jest.fn(),
  createUserConnectionState: jest.fn(),
  disconnectGmail: jest.fn(),
  getAuthorizationUrl: jest.fn(),
  getGmailConnection: jest.fn(),
  isGmailRateLimitError: jest.fn(),
  sendEmail: jest.fn(),
  verifyConnectionState: jest.fn(),
}));

const user = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const token = signAccessToken(user);
const oauthState = "test-state.signature";
const stateCookie = `jobpilot_gmail_oauth_state=${oauthState}`;

describe("Gmail OAuth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated connection, callback, status, and disconnect requests", async () => {
    const responses = await Promise.all([
      request(app).get("/api/gmail/connect"),
      request(app).get("/api/gmail/callback"),
      request(app).get("/api/gmail/status"),
      request(app).post("/api/gmail/disconnect"),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("AUTH_REQUIRED");
    }
  });

  it("starts OAuth with a user-bound state cookie and returns the authorization URL", async () => {
    gmailService.createUserConnectionState.mockReturnValue(oauthState);
    gmailService.getAuthorizationUrl.mockReturnValue(
      "https://accounts.google.test/oauth?scope=gmail.send",
    );

    const response = await request(app)
      .get("/api/gmail/connect")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        authorizationUrl:
          "https://accounts.google.test/oauth?scope=gmail.send",
      },
      error: null,
    });
    expect(gmailService.createUserConnectionState).toHaveBeenCalledWith(
      user._id.toString(),
    );
    expect(gmailService.getAuthorizationUrl).toHaveBeenCalledWith(oauthState);
    expect(response.headers["set-cookie"][0]).toContain(
      "jobpilot_gmail_oauth_state=",
    );
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("completes OAuth callback and redirects only to the configured frontend", async () => {
    gmailService.verifyConnectionState.mockReturnValue(true);
    gmailService.connectGmail.mockResolvedValue(undefined);

    const response = await request(app)
      .get(`/api/gmail/callback?state=${encodeURIComponent(oauthState)}&code=oauth-code`)
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", stateCookie);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/settings?gmail=connected",
    );
    expect(gmailService.verifyConnectionState).toHaveBeenCalledWith(
      oauthState,
      user._id.toString(),
    );
    expect(gmailService.connectGmail).toHaveBeenCalledWith(
      user._id.toString(),
      "oauth-code",
    );
  });

  it("rejects invalid OAuth state without exchanging the code", async () => {
    gmailService.verifyConnectionState.mockReturnValue(false);

    const response = await request(app)
      .get(`/api/gmail/callback?state=${encodeURIComponent(oauthState)}&code=oauth-code`)
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", stateCookie);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://localhost:3000/settings?gmail=error&reason=invalid_state",
    );
    expect(gmailService.connectGmail).not.toHaveBeenCalled();
  });

  it("handles denied consent and missing authorization code safely", async () => {
    gmailService.verifyConnectionState.mockReturnValue(true);

    const denied = await request(app)
      .get(
        `/api/gmail/callback?state=${encodeURIComponent(oauthState)}&error=access_denied`,
      )
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", stateCookie);
    const missingCode = await request(app)
      .get(`/api/gmail/callback?state=${encodeURIComponent(oauthState)}`)
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", stateCookie);

    expect(denied.headers.location).toBe(
      "http://localhost:3000/settings?gmail=error&reason=access_denied",
    );
    expect(missingCode.headers.location).toBe(
      "http://localhost:3000/settings?gmail=error&reason=missing_code",
    );
    expect(gmailService.connectGmail).not.toHaveBeenCalled();
  });

  it("redirects with a safe reason when token exchange fails", async () => {
    gmailService.verifyConnectionState.mockReturnValue(true);
    gmailService.connectGmail.mockRejectedValue(
      new ApiError(
        502,
        "Google authorization could not be completed",
        "GMAIL_OAUTH_EXCHANGE_FAILED",
      ),
    );

    const response = await request(app)
      .get(`/api/gmail/callback?state=${encodeURIComponent(oauthState)}&code=oauth-code`)
      .set("Authorization", `Bearer ${token}`)
      .set("Cookie", stateCookie);

    expect(response.headers.location).toBe(
      "http://localhost:3000/settings?gmail=error&reason=gmail_oauth_exchange_failed",
    );
    expect(response.headers.location).not.toContain("oauth-code");
  });

  it("returns Gmail status without exposing stored tokens", async () => {
    gmailService.getGmailConnection.mockResolvedValue({
      connected: true,
      connectedAt: "2026-11-26T00:00:00.000Z",
      email: null,
      grantedScopes: ["https://www.googleapis.com/auth/gmail.send"],
    });

    const response = await request(app)
      .get("/api/gmail/status")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.connection.connected).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("refresh-token");
    expect(JSON.stringify(response.body)).not.toContain("access-token");
  });

  it("disconnects the authenticated user's Gmail account", async () => {
    gmailService.disconnectGmail.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/api/gmail/disconnect")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: null,
      error: null,
    });
    expect(gmailService.disconnectGmail).toHaveBeenCalledWith(
      user._id.toString(),
    );
  });
});
