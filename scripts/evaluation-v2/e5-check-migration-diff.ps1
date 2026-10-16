# Read-only migration drift check against the Prisma schema.
# Prisma uses a disposable shadow database to replay migrations.
param()
$ErrorActionPreference = "Stop"
$shadowUrl = "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55440/northpark_e5_shadow_test"
& docker compose -f docker-compose.e5-test.yml up -d --wait e5-shadow-postgres
if ($LASTEXITCODE -ne 0) { throw "E5 shadow database failed to start." }
if ($env:DATABASE_URL) {
  $primary = [Uri]$env:DATABASE_URL
  if (($primary.Host -eq "127.0.0.1" -or $primary.Host -eq "localhost") -and
      $primary.Port -eq 55440 -and $primary.AbsolutePath -eq "/northpark_e5_shadow_test") {
    throw "Shadow DB is configured as DATABASE_URL. Refusing to run."
  }
}
Write-Host "Comparing ALL migration history to current Prisma schema using disposable shadow DB."
Write-Host "No migration will be applied to the application database."
& npx prisma migrate diff --config prisma.e5-diff.config.ts --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
$diffExit = $LASTEXITCODE
if ($diffExit -eq 0) {
  Write-Host "PASS: migrations and Prisma schema match (no drift detected)."
} elseif ($diffExit -eq 2) {
  throw "DRIFT: Prisma schema differs from migration history. Inspect output before applying anything."
} else {
  throw "Prisma diff failed (exit code $diffExit). Check Prisma CLI flags and shadow migration dependencies."
}
