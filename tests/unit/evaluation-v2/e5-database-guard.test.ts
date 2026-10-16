import { describe, expect, it } from "vitest";
import { assertIsolatedE5Database } from "@/lib/evaluation-v2/e5-test-database-guard";

const testUrl = "postgresql://tester:password@localhost:5432/northpark_e5_test";
describe("E5.4 isolated database safety guard", () => {
  it("accepts a clearly named, separate PostgreSQL test database", () => {
    expect(assertIsolatedE5Database(testUrl, "postgresql://app:pass@localhost:5432/northpark"))
      .toBe(testUrl);
  });
  it("denies missing, production-looking, identical or malformed URLs", () => {
    for (const url of [
      undefined, "postgresql://tester:password@localhost:5432/northpark",
      "postgresql://tester:password@localhost:5432/postgres",
      "http://localhost/northpark_e5_test", "not a url",
    ]) expect(() => assertIsolatedE5Database(url, undefined)).toThrow();
    expect(() => assertIsolatedE5Database(testUrl, testUrl)).toThrow("E5_PRIMARY_DATABASE_FORBIDDEN");
    expect(() => assertIsolatedE5Database(testUrl,
      "postgresql://admin:another@localhost:5432/northpark_e5_test"))
      .toThrow("E5_PRIMARY_DATABASE_FORBIDDEN");
  });
});
