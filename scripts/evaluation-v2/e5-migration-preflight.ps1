# E5.4 migration preview only — never use on an existing application database.
# Requires isolated PostgreSQL database ending _e5_test and dedicated credentials.
param([switch]$ConfirmDisposableDatabase)
$ErrorActionPreference = "Stop"
if (-not $ConfirmDisposableDatabase) { throw "Pass -ConfirmDisposableDatabase after verifying the disposable DB." }
$testUrl = $env:E5_TEST_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($testUrl)) { throw "E5_TEST_DATABASE_URL is required." }
try { $target = [System.Uri]::new($testUrl) } catch { throw "Invalid E5_TEST_DATABASE_URL." }
if ($target.Scheme -notin @("postgresql","postgres")) { throw "PostgreSQL URL required." }
$name = [System.Uri]::UnescapeDataString($target.AbsolutePath.TrimStart('/'))
if ($name -cnotmatch '^[A-Za-z0-9_]+_e5_test$') { throw "Database name must end with _e5_test." }
if (-not $target.Host -or -not $target.UserInfo) { throw "Target URL is missing host or credentials." }
if ($env:DATABASE_URL) {
  try { $main = [System.Uri]::new($env:DATABASE_URL) } catch { throw "Invalid DATABASE_URL." }
  if ($main.Host -eq $target.Host -and $main.Port -eq $target.Port -and
      $main.AbsolutePath -eq $target.AbsolutePath) { throw "Test database matches DATABASE_URL. Refusing." }
}
$previous = $env:DATABASE_URL
try {
  # prisma.config.ts resolves DATABASE_URL. Override ONLY inside this process.
  $env:DATABASE_URL = $testUrl
  Write-Host "Reviewing ONLY isolated test DB '$name' on '$($target.Host)'."
  & npx prisma validate
  if ($LASTEXITCODE -ne 0) { throw "Prisma validation failed." }
  & npx prisma migrate status
  if ($LASTEXITCODE -ne 0) { throw "Migration status not clean: inspect before continuing." }
  Write-Host "Schema validated. No schema changes have been applied by this script."
  Write-Host "To generate a migration after reviewing existing migration history, run:"
  Write-Host '  npx prisma migrate dev --create-only --name e5_registry_candidate'
  Write-Host "Only with DATABASE_URL manually verified as the isolated test DB."
} finally {
  if ($null -eq $previous) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
  else { $env:DATABASE_URL = $previous }
}
