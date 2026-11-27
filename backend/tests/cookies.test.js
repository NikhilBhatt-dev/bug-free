const {
  getAuthCookieOptions,
  getOAuthStateCookieOptions,
} = require("../src/utils/cookies");

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
};

function restoreEnvironment() {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

describe("authentication cookie options", () => {
  afterEach(restoreEnvironment);

  it("uses secure cross-site attributes in production regardless of local cookie settings", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SECURE = "false";
    process.env.COOKIE_SAME_SITE = "lax";

    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    expect(getOAuthStateCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
  });

  it("preserves configured development cookie behavior", () => {
    process.env.NODE_ENV = "development";
    process.env.COOKIE_SECURE = "false";
    process.env.COOKIE_SAME_SITE = "lax";

    expect(getAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });
});
