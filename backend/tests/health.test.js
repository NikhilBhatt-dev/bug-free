const request = require("supertest");
const app = require("../src/app");

describe("GET /api/health", () => {
  it("returns the standard healthy response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.error).toBeNull();
  });
});
