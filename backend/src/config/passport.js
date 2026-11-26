const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const GOOGLE_LOGIN_SCOPES = ["openid", "profile", "email"];

function isGoogleLoginConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL,
  );
}

function configurePassport() {
  if (!isGoogleLoginConfigured()) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        // Login tokens are deliberately not persisted. Gmail authorization is a separate flow.
        done(null, profile);
      },
    ),
  );
}

module.exports = {
  configurePassport,
  GOOGLE_LOGIN_SCOPES,
  isGoogleLoginConfigured,
  passport,
};
