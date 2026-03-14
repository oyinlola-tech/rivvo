import request from "supertest";
import app from "../src/app.js";

describe("API basics", () => {
  it("returns 404 for unknown api routes", async () => {
    const res = await request(app).get("/api/unknown-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not Found", message: "Route not found" });
  });

  it("returns 404 for missing paths", async () => {
    const res = await request(app).get("/missing-path");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not Found", message: "Route not found" });
  });
});
