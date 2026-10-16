/** E5.4 guard: NEVER create or migrate a database from this module. */
export function assertIsolatedE5Database(testUrl: string | undefined, primaryUrl: string | undefined): string {
  if (!testUrl) throw new Error("E5_TEST_DATABASE_URL_REQUIRED");
  let target: URL;
  try { target = new URL(testUrl); }
  catch { throw new Error("E5_INVALID_DATABASE_URL"); }
  if (target.protocol !== "postgresql:" && target.protocol !== "postgres:")
    throw new Error("E5_POSTGRES_REQUIRED");
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (!/^[a-zA-Z0-9_]+_e5_test$/.test(dbName))
    throw new Error("E5_TEST_DATABASE_NAME_REQUIRED");
  if (!target.hostname || !dbName || !target.username)
    throw new Error("E5_INVALID_DATABASE_URL");
  if (primaryUrl) {
    let primary: URL;
    try { primary = new URL(primaryUrl); }
    catch { throw new Error("E5_INVALID_PRIMARY_DATABASE_URL"); }
    if (target.href === primary.href || (
      target.hostname === primary.hostname && target.port === primary.port
      && target.pathname === primary.pathname))
      throw new Error("E5_PRIMARY_DATABASE_FORBIDDEN");
  }
  return testUrl;
}
