import { describe, it, expect, vi } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";

describe("Auth Route Handlers", () => {
  it("rejects login request when email or password is missing", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Email and password are required");
  });

  it("returns error response on empty request payload", async () => {
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(400);
  });
});
