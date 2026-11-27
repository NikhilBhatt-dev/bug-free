const crypto = require("crypto");
const {
  createGmailOAuthClient,
  GMAIL_SEND_SCOPE,
  getGmailConfigurationIssues,
  isGmailConfigured,
} = require("../config/gmail");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { UserSettings } = require("../models");
const { ApiError } = require("../utils/apiError");
const { decryptSecret, encryptSecret } = require("../utils/encryption");

function assertGmailConfigured() {
  if (!isGmailConfigured()) {
    const { missing, invalid } = getGmailConfigurationIssues();
    throw new ApiError(
      503,
      "Gmail sending is not configured",
      "GMAIL_NOT_CONFIGURED",
      { missing, invalid },
    );
  }
}

function assertSafeHeader(value, field) {
  if (!value || /[\r\n]/.test(value)) {
    throw new ApiError(400, `Invalid ${field}`, "INVALID_EMAIL_HEADER");
  }
}

function createConnectionState() {
  return crypto.randomBytes(32).toString("base64url");
}

function createUserConnectionState(userId) {
  const nonce = createConnectionState();
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(`${userId}.${nonce}`)
    .digest("base64url");
  return `${nonce}.${signature}`;
}

function verifyConnectionState(state, userId) {
  if (typeof state !== "string" || typeof userId !== "string") return false;
  const [nonce, signature, extra] = state.split(".");
  if (!nonce || !signature || extra !== undefined) return false;

  const expected = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(`${userId}.${nonce}`)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

function getAuthorizationUrl(state) {
  assertGmailConfigured();
  try {
    return createGmailOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [GMAIL_SEND_SCOPE],
      include_granted_scopes: false,
      state,
    });
  } catch {
    throw new ApiError(
      502,
      "Gmail authorization could not be started",
      "GMAIL_AUTHORIZATION_URL_FAILED",
    );
  }
}

async function connectGmail(userId, code) {
  assertGmailConfigured();
  const client = createGmailOAuthClient();
  let tokenResponse;
  try {
    tokenResponse = await client.getToken(code);
  } catch {
    throw new ApiError(
      502,
      "Google authorization could not be completed",
      "GMAIL_OAUTH_EXCHANGE_FAILED",
    );
  }
  const tokens = tokenResponse?.tokens;
  if (!tokens?.refresh_token) {
    throw new ApiError(
      400,
      "Google did not provide a refresh token. Remove JobPilot Gmail access in Google Account settings and connect again.",
      "GMAIL_REFRESH_TOKEN_MISSING",
    );
  }

  await UserSettings.updateOne(
    { userId },
    {
      $set: {
        "gmailConnection.connected": true,
        "gmailConnection.connectedAt": new Date(),
        "gmailConnection.email": null,
        "gmailConnection.encryptedRefreshToken": encryptSecret(tokens.refresh_token),
        "gmailConnection.grantedScopes": [GMAIL_SEND_SCOPE],
      },
    },
    { upsert: true, runValidators: true },
  );
}

async function disconnectGmail(userId) {
  const settings = await UserSettings.findOne({ userId }).select("+gmailConnection.encryptedRefreshToken");
  let revocationFailed = false;
  if (settings?.gmailConnection?.encryptedRefreshToken && isGmailConfigured()) {
    try {
      const client = createGmailOAuthClient();
      client.setCredentials({
        refresh_token: decryptSecret(
          settings.gmailConnection.encryptedRefreshToken,
        ),
      });
      await client.revokeCredentials();
    } catch {
      revocationFailed = true;
    }
  }
  await UserSettings.updateOne(
    { userId },
    {
      $set: {
        "gmailConnection.connected": false,
        "gmailConnection.connectedAt": null,
        "gmailConnection.email": null,
        "gmailConnection.encryptedRefreshToken": null,
        "gmailConnection.grantedScopes": [],
      },
    },
  );
  if (revocationFailed) {
    throw new ApiError(
      502,
      "Gmail was disconnected locally, but Google token revocation failed",
      "GMAIL_REVOCATION_FAILED",
    );
  }
}

async function getAuthorizedGmailClient(userId) {
  assertGmailConfigured();
  const settings = await UserSettings.findOne({ userId }).select("+gmailConnection.encryptedRefreshToken");
  const encryptedToken = settings?.gmailConnection?.encryptedRefreshToken;
  if (!settings?.gmailConnection?.connected || !encryptedToken) {
    throw new ApiError(400, "Connect Gmail before sending emails", "GMAIL_NOT_CONNECTED");
  }
  const client = createGmailOAuthClient();
  client.setCredentials({ refresh_token: decryptSecret(encryptedToken) });
  return client;
}

async function getGmailConnection(userId) {
  const settings = await UserSettings.findOne({ userId }).lean();
  const connection = settings?.gmailConnection || { connected: false, connectedAt: null, email: null };
  return {
    connected: connection.connected,
    connectedAt: connection.connectedAt,
    email: connection.email,
    grantedScopes: connection.grantedScopes || [],
  };
}

async function downloadPrivateCv(cv) {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, "CV storage is not configured", "CV_STORAGE_NOT_CONFIGURED");
  }
  const url = cloudinary.utils.private_download_url(cv.cloudinaryPublicId, "pdf", {
    resource_type: "raw",
    type: "private",
    attachment: false,
  });
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(502, "The selected CV could not be retrieved", "CV_DOWNLOAD_FAILED");
  }
  return Buffer.from(await response.arrayBuffer());
}

function createRawMessage({ to, subject, body, attachment, attachmentName }) {
  assertSafeHeader(to, "recipient");
  assertSafeHeader(subject, "subject");
  const boundary = `jobpilot_${crypto.randomBytes(12).toString("hex")}`;
  const safeName = attachmentName.replace(/[\r\n"\\]/g, "_");
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
    "",
    `--${boundary}`,
    "Content-Type: application/pdf",
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeName}"`,
    "",
    attachment.toString("base64"),
    "",
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

async function sendEmail(userId, email, cv) {
  const client = await getAuthorizedGmailClient(userId);
  const attachment = await downloadPrivateCv(cv);
  const raw = createRawMessage({
    to: email.recipient,
    subject: email.subject,
    body: email.body,
    attachment,
    attachmentName: cv.originalFileName,
  });
  const accessTokenResponse = await client.getAccessToken();
  const accessToken =
    typeof accessTokenResponse === "string"
      ? accessTokenResponse
      : accessTokenResponse?.token;
  if (!accessToken) {
    throw new ApiError(
      502,
      "Gmail access token could not be obtained",
      "GMAIL_TOKEN_UNAVAILABLE",
    );
  }
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!response.ok) {
    const status = response.status;
    let reason = null;
    try {
      const providerBody = await response.json();
      reason =
        providerBody?.error?.errors?.[0]?.reason ||
        providerBody?.error?.status ||
        null;
    } catch {}
    const error = new Error("Gmail send request failed");
    error.code = status;
    error.response = {
      status,
      data: {
        error: { errors: reason ? [{ reason }] : [] },
      },
    };
    throw error;
  }
  const result = await response.json();
  return { data: { id: result.id, threadId: result.threadId } };
}

function isGmailRateLimitError(error) {
  const status = error?.code || error?.response?.status;
  const reasons = error?.response?.data?.error?.errors?.map((item) => item.reason) || [];
  return status === 429 || ["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"].some((reason) => reasons.includes(reason));
}

module.exports = {
  connectGmail,
  createConnectionState,
  createUserConnectionState,
  disconnectGmail,
  getAuthorizationUrl,
  getGmailConnection,
  isGmailRateLimitError,
  sendEmail,
  verifyConnectionState,
};
