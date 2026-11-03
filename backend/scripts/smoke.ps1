# Smoke test for the GeoEntity Manager backend (CRUD + validation + CORS + persistence).
#
# Scope / safety:
#  - Starts ONLY the local Go backend binary (backend\bin\server.exe, built with `go build -o bin/server.exe ./cmd/server`).
#  - Sends HTTP requests ONLY to http://localhost:$Port.
#  - Uses a throw-away SQLite file in the system temp dir (geo-smoke-<random>.db*) and request-body temp files it creates itself.
#  - On exit (success or failure) it stops the server process it started and deletes only the temp files it created.
#  - Does not touch system settings, environment variables outside this process, or any project files.
#
# Every check is an assertion. Any failed assertion, curl failure, or unexpected error makes the script exit with code 1.
#
# Usage (from the backend folder):  powershell -NoProfile -File .\scripts\smoke.ps1
param([int]$Port = 18080)

$ErrorActionPreference = "Stop"
$backend   = Split-Path -Parent $PSScriptRoot
$exe       = Join-Path $backend "bin\server.exe"
$tag       = [guid]::NewGuid().ToString("N").Substring(0, 8)
$db        = Join-Path $env:TEMP "geo-smoke-$tag.db"
$srvLog    = Join-Path $env:TEMP "geo-smoke-$tag.log"
$bodyFiles = New-Object System.Collections.Generic.List[string]
$base      = "http://localhost:$Port"
$script:passed = 0
$script:failed = 0

function Assert($ok, $what) {
  if ($ok) { $script:passed++; Write-Host "  PASS  $what" }
  else     { $script:failed++; Write-Host "  FAIL  $what" -ForegroundColor Red }
}

function Wait-Up {
  for ($i = 0; $i -lt 60; $i++) {
    $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 2 "$base/healthz"
    if ($LASTEXITCODE -eq 0 -and $code -eq "200") { return }
    Start-Sleep -Milliseconds 250
  }
  throw "server did not become healthy on $base"
}

function Start-Srv { Start-Process -FilePath $exe -PassThru -WindowStyle Hidden -RedirectStandardError $srvLog }

# Sends one request and asserts the expected status. Returns @{ Code; Json } (Json is $null for empty/non-JSON bodies).
# A curl failure (non-zero exit) is recorded as a failed assertion and returns Code 0.
function Call($method, $path, $body, [int]$expect) {
  $a = @("-s", "--max-time", "10", "-w", "`n%{http_code}", "-X", $method, "$base$path")
  if ($body) {
    $tmp = Join-Path $env:TEMP "geo-smoke-$tag-$($bodyFiles.Count).json"
    [IO.File]::WriteAllText($tmp, $body); $bodyFiles.Add($tmp)
    $a += @("-H", "Content-Type: application/json", "--data-binary", "@$tmp")
  }
  $out = (curl.exe @a) -join "`n"
  if ($LASTEXITCODE -ne 0) {
    Assert $false "$method $path : curl failed (exit $LASTEXITCODE)"
    return @{ Code = 0; Json = $null }
  }
  $i = $out.LastIndexOf("`n")
  $code = [int]$out.Substring($i + 1)
  $raw = $out.Substring(0, $i).Trim()
  $json = $null
  if ($raw) { try { $json = $raw | ConvertFrom-Json } catch { $json = $null } }
  Assert ($code -eq $expect) "$method $path -> $code (expected $expect)"
  return @{ Code = $code; Json = $json }
}

if (-not (Test-Path $exe)) { throw "Build the server first: cd backend; go build -o bin/server.exe ./cmd/server" }
# Refuse to run if something is already listening on the port (never talk to an unknown service).
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  throw "Port $Port is already in use; pass -Port <free port>."
}
# Environment for the child process only (this script's own process; not persisted anywhere).
$env:PORT = "$Port"; $env:DB_PATH = $db; $env:SEED = "true"

$srv = $null
try {
  $srv = Start-Srv; Wait-Up

  Write-Host "== health"
  $r = Call GET /healthz $null 200
  Assert ($r.Json.status -eq "ok") "health body status == ok"

  Write-Host "== seed data"
  $r = Call GET /api/v1/entities $null 200
  Assert (@($r.Json.data).Count -eq 6) "6 seeded entities"

  Write-Host "== CREATE"
  $r = Call POST /api/v1/entities '{"code":"sm-1","name":"Smoke","type":"vehicle","status":"active","latitude":0,"longitude":0}' 201
  $created = $r.Json.data
  $id = $created.id
  Assert ($id -match '^[0-9a-f-]{36}$') "created id is a UUID"
  Assert ($created.code -eq "SM-1") "code normalized to uppercase"
  Assert ($created.latitude -eq 0 -and $created.longitude -eq 0) "zero coordinates accepted and returned"
  Assert ($created.createdAt -and $created.updatedAt) "createdAt/updatedAt set"

  Write-Host "== READ"
  $r = Call GET "/api/v1/entities/$id" $null 200
  Assert ($r.Json.data.id -eq $id -and $r.Json.data.name -eq "Smoke" -and $r.Json.data.status -eq "active") "read returns the created entity"

  Write-Host "== UPDATE"
  $r = Call PUT "/api/v1/entities/$id" '{"code":"SM-1","name":"Smoke 2","type":"facility","status":"maintenance","latitude":-33.86,"longitude":151.2}' 200
  $u = $r.Json.data
  Assert ($u.id -eq $id -and $u.name -eq "Smoke 2" -and $u.type -eq "facility" -and $u.status -eq "maintenance") "update changed name/type/status"
  Assert ($u.latitude -eq -33.86 -and $u.longitude -eq 151.2) "update changed coordinates"
  Assert ($u.createdAt -eq $created.createdAt) "createdAt preserved on update"
  $r = Call GET "/api/v1/entities/$id" $null 200
  Assert ($r.Json.data.name -eq "Smoke 2") "update is visible on re-read"

  Write-Host "== filters"
  $r = Call GET "/api/v1/entities?status=maintenance" $null 200
  Assert (@($r.Json.data).Count -eq 2) "status=maintenance returns 2 (seeded TR-204 + SM-1)"
  $r = Call GET "/api/v1/entities?q=market" $null 200
  Assert (@($r.Json.data).Count -eq 1 -and $r.Json.data[0].code -eq "DV-101") "q=market finds DV-101"
  $r = Call GET "/api/v1/entities?type=bogus" $null 400
  Assert ($r.Json.error.code -eq "invalid_query") "bad type filter -> invalid_query"

  Write-Host "== validation and error responses"
  $r = Call POST /api/v1/entities '{"code":"X-1","name":"","type":"drone","status":"broken","latitude":91,"longitude":-181}' 422
  Assert ($r.Json.error.code -eq "validation_failed") "error code validation_failed"
  $fields = @($r.Json.error.details.field)
  foreach ($f in "name", "type", "status", "latitude", "longitude") { Assert ($fields -contains $f) "422 details include field '$f'" }
  $r = Call POST /api/v1/entities '{"code":"X-2","name":"n","type":"vehicle","status":"active","latitude":90.5,"longitude":180.5}' 422
  Assert (@($r.Json.error.details.field) -contains "latitude" -and @($r.Json.error.details.field) -contains "longitude") "out-of-range lat/lng rejected"
  $r = Call POST /api/v1/entities '{"code":"SM-1","name":"dup","type":"vehicle","status":"active","latitude":1,"longitude":1}' 409
  Assert ($r.Json.error.code -eq "conflict" -and $r.Json.error.details[0].field -eq "code") "duplicate code -> conflict on 'code'"
  $r = Call POST /api/v1/entities '{"code":' 400
  Assert ($r.Json.error.code -eq "invalid_json") "malformed JSON -> invalid_json"
  $r = Call POST /api/v1/entities '{"code":"Q-1","name":"n","type":"vehicle","status":"active","latitude":1,"longitude":1,"id":"abc"}' 400
  Assert ($r.Json.error.code -eq "invalid_json") "unknown/read-only field rejected (invalid_json)"
  $r = Call GET /api/v1/entities/not-a-uuid $null 400
  Assert ($r.Json.error.code -eq "invalid_id") "bad id -> invalid_id"
  $r = Call GET /api/v1/entities/6f1c7c2e-8f0b-4a37-9c52-1b5c3a2f9d10 $null 404
  Assert ($r.Json.error.code -eq "not_found") "unknown id -> not_found"
  $r = Call GET /api/v1/entities $null 200
  Assert (@($r.Json.data).Count -eq 7) "rejected requests stored nothing (still 7)"

  Write-Host "== CORS preflight"
  $hdrs = (curl.exe -s -i --max-time 10 -X OPTIONS "$base/api/v1/entities" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST") -join "`n"
  Assert ($LASTEXITCODE -eq 0) "preflight curl succeeded"
  Assert ($hdrs -match '(?im)^Access-Control-Allow-Origin:\s*http://localhost:5173\s*$') "allowed origin echoed"

  Write-Host "== persistence across restart"
  Stop-Process -Id $srv.Id -Force; Start-Sleep 1
  $srv = Start-Srv; Wait-Up
  $r = Call GET /api/v1/entities $null 200
  Assert (@($r.Json.data).Count -eq 7) "7 entities after restart"
  $sm = @($r.Json.data) | Where-Object { $_.code -eq "SM-1" }
  Assert ($sm -and $sm.id -eq $id -and $sm.name -eq "Smoke 2") "updated SM-1 survived restart"

  Write-Host "== DELETE"
  $r = Call DELETE "/api/v1/entities/$id" $null 204
  Assert ($null -eq $r.Json) "delete returns empty body"
  Call GET "/api/v1/entities/$id" $null 404 | Out-Null
  Call DELETE "/api/v1/entities/$id" $null 404 | Out-Null
  $r = Call GET /api/v1/entities $null 200
  Assert (@($r.Json.data).Count -eq 6) "back to 6 entities"
}
catch {
  $script:failed++
  Write-Host "  FAIL  unexpected error: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
  # Clean up only what this script created.
  if ($srv) { Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue; Start-Sleep 1 }
  foreach ($f in $bodyFiles) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
  foreach ($f in @($db, "$db-wal", "$db-shm", $srvLog)) { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "Result: $script:passed passed, $script:failed failed"
if ($script:failed -gt 0) { exit 1 }
exit 0
