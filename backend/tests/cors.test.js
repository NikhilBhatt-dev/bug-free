const originalFrontendUrl = process.env.FRONTEND_URL;
process.env.FRONTEND_URL = "https://job-pilot-8814.vercel.app";

const request = require("supertest");
const app = require("../src/app");

afterAll(() => {
  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe("CORS frontend origin allowlist", () => {
  it("allows configured frontend origins with credentials", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://job-pilot-8814.vercel.app");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://job-pilot-8814.vercel.app",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant CORS access to an untrusted origin", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app)
        .get("/api/health")
        .set("Origin", "https://attacker.example");

      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
  });
});
