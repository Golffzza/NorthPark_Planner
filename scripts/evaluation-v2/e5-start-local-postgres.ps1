param([switch]$RunIntegration)
$ErrorActionPreference = "Stop"
$localUrl = "postgresql://e5_fixture:e5_local_fixture_only@127.0.0.1:55439/northpark_e5_test"
if ($env:DATABASE_URL) {
  $primary = [Uri]$env:DATABASE_URL
  if ($primary.Host -in @("127.0.0.1","localhost") -and
      $primary.Port -eq 55439 -and $primary.AbsolutePath -eq "/northpark_e5_test") {
    throw "DATABASE_URL points to the E5 fixture database; refusing to override the primary configured connection."
  }
}
& docker compose -p northpark-e5-isolated -f docker-compose.e5-test.yml up -d --wait
if ($LASTEXITCODE -ne 0) { throw "Failed to start isolated PostgreSQL container" }
$previous = $env:E5_TEST_DATABASE_URL
try {
  $env:E5_TEST_DATABASE_URL = $localUrl
  & ./scripts/evaluation-v2/e5-migration-preflight.ps1 -ConfirmDisposableDatabase
  if ($RunIntegration) {
    Write-Host "Integration execution requires separately reviewed and applied migrations."
    Write-Host "This script intentionally does NOT apply migrations or set RUN_E5_PG_INTEGRATION."
  }
} finally {
  if ($null -eq $previous) { Remove-Item Env:E5_TEST_DATABASE_URL -ErrorAction SilentlyContinue }
  else { $env:E5_TEST_DATABASE_URL = $previous }
}
