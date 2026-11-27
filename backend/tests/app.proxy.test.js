describe("Express proxy trust configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("trusts exactly one proxy hop in production", () => {
    process.env.NODE_ENV = "production";

    let app;
    jest.isolateModules(() => {
      app = require("../src/app");
    });

    expect(app.get("trust proxy")).toBe(1);
  });

  it("keeps the default proxy behavior in development", () => {
    process.env.NODE_ENV = "development";

    let app;
    jest.isolateModules(() => {
      app = require("../src/app");
    });

    expect(app.get("trust proxy")).toBe(false);
  });
});
