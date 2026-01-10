import { sanitizeLogMeta } from "../logger";

describe("sanitizeLogMeta", () => {
  it("redacts obvious secrets", () => {
    const out = sanitizeLogMeta({
      password: "super-secret",
      access_token: "abc",
      Authorization: "Bearer xyz",
      cookie: "session=123",
      nested: { refreshToken: "r1" },
    });

    expect(out.password).toBe("[REDACTED]");
    expect(out.access_token).toBe("[REDACTED]");
    expect(out.Authorization).toBe("[REDACTED]");
    expect(out.cookie).toBe("[REDACTED]");
    expect(out.nested.refreshToken).toBe("[REDACTED]");
  });

  it("masks email and phone-like strings", () => {
    const out = sanitizeLogMeta({
      email: "john.doe@example.com",
      phone: "+56 9 1234 5678",
    });

    // email: local part masked
    expect(out.email).toContain("@example.com");
    expect(out.email).not.toBe("john.doe@example.com");

    // phone: redacted prefix + last4 preserved
    expect(String(out.phone)).toContain("[REDACTED]");
    expect(String(out.phone)).toMatch(/\*\*\*\*\d{4}$/);
  });

  it("handles circular structures", () => {
    const a: any = { name: "a" };
    a.self = a;

    const out = sanitizeLogMeta(a);
    expect(out.self).toBe("[circular]");
  });
});
