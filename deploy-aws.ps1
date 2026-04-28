[CmdletBinding()]
param(
    [switch]$SkipScreenViewer,
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$KEY         = "D:\TEMP\AWS\tcs_dev_2023.pem"
$EC2         = "ec2-user@54.64.46.6"
$API_DIR     = "C:\Projects\SC-HearingSystem\SCHearing.API"
$WEB_DIR     = "C:\Projects\SC-HearingSystem\sc-hearing-web"
$REMOTE_BASE = "/var/www/sc-hearing"

function Step($msg)  { Write-Host ""; Write-Host "==== $msg ====" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Info($msg)  { Write-Host "  [..] $msg" -ForegroundColor Gray }
function Fail($msg)  { Write-Host "  [NG] $msg" -ForegroundColor Red }

function Check-Last($action) {
    if ($LASTEXITCODE -ne 0) {
        Fail "$action failed (exit=$LASTEXITCODE)"
        throw "$action failed"
    }
}

$doApi = -not $FrontendOnly
$doWeb = -not $BackendOnly
$doBuild = -not $SkipBuild

Step "Deploy Configuration"
Info "Backend       : $(if ($doApi) { 'YES' } else { 'NO' })"
Info "Frontend      : $(if ($doWeb) { 'YES' } else { 'NO' })"
Info "Build         : $(if ($doBuild) { 'YES' } else { 'SKIP' })"
Info "Screen Viewer : $(if ($SkipScreenViewer) { 'SKIP (fast mode)' } else { 'INCLUDE (full mode)' })"

$startTime = Get-Date

if ($doBuild -and $doApi) {
    Step "1a. Backend Build"
    Push-Location $API_DIR
    try {
        Info "dotnet clean..."
        dotnet clean | Out-Null
        Check-Last "dotnet clean"
        Info "dotnet publish -c Release..."
        dotnet publish -c Release -o publish | Out-Host
        Check-Last "dotnet publish"
        Ok "Backend built"
    } finally { Pop-Location }
}

if ($doBuild -and $doWeb) {
    Step "1b. Frontend Build"
    Push-Location $WEB_DIR
    try {
        if (Test-Path dist) {
            Info "Removing existing dist..."
            Remove-Item -Recurse -Force dist
        }
        Info "npm run build..."
        npm run build | Out-Host
        Check-Last "npm run build"
        Ok "Frontend built"
    } finally { Pop-Location }
}

$apiArchive = "$env:TEMP\sc-api.tar.gz"
$webArchive = "$env:TEMP\sc-web.tar.gz"

if ($doApi) {
    Step "2a. Backend Package"
    if (Test-Path $apiArchive) { Remove-Item $apiArchive }
    Push-Location "$API_DIR\publish"
    try {
        tar -czf $apiArchive .
        Check-Last "tar (api)"
        $size = [math]::Round((Get-Item $apiArchive).Length / 1MB, 2)
        Ok "Archive: $size MB"
    } finally { Pop-Location }
}

if ($doWeb) {
    Step "2b. Frontend Package"
    if (Test-Path $webArchive) { Remove-Item $webArchive }
    Push-Location "$WEB_DIR\dist"
    try {
        if ($SkipScreenViewer) {
            Info "Excluding screen-viewer for faster upload..."
            tar --exclude='screen-viewer' -czf $webArchive .
        } else {
            Info "Including all files (screen-viewer included)..."
            tar -czf $webArchive .
        }
        Check-Last "tar (web)"
        $size = [math]::Round((Get-Item $webArchive).Length / 1MB, 2)
        Ok "Archive: $size MB"
    } finally { Pop-Location }
}

if ($doApi) {
    Step "3a. Backend Upload (scp)"
    scp -i $KEY $apiArchive "${EC2}:/tmp/sc-api.tar.gz"
    Check-Last "scp api"
    Ok "Uploaded"
}

if ($doWeb) {
    Step "3b. Frontend Upload (scp)"
    scp -i $KEY $webArchive "${EC2}:/tmp/sc-web.tar.gz"
    Check-Last "scp web"
    Ok "Uploaded"
}

Step "4. Deploy on EC2"

$bashScript = "set -e`n"

if ($doApi) {
    $bashScript += @"

echo '--- [API] Stop sc-hearing service ---'
sudo systemctl stop sc-hearing || true

echo '--- [API] Extract archive ---'
mkdir -p /tmp/api-update
rm -rf /tmp/api-update/*
tar xzf /tmp/sc-api.tar.gz -C /tmp/api-update/

echo '--- [API] Copy to ${REMOTE_BASE} ---'
sudo cp -r /tmp/api-update/* ${REMOTE_BASE}/

"@
}

if ($doWeb) {
    if ($SkipScreenViewer) {
        $bashScript += @"

echo '--- [Web] Extract archive ---'
mkdir -p /tmp/web-update
rm -rf /tmp/web-update/*
tar xzf /tmp/sc-web.tar.gz -C /tmp/web-update/

echo '--- [Web] Clean wwwroot (preserving screen-viewer) ---'
sudo find ${REMOTE_BASE}/wwwroot -mindepth 1 -maxdepth 1 ! -name 'screen-viewer' -exec sudo rm -rf {} +

echo '--- [Web] Copy new files ---'
sudo cp -r /tmp/web-update/* ${REMOTE_BASE}/wwwroot/

"@
    } else {
        $bashScript += @"

echo '--- [Web] Extract archive ---'
mkdir -p /tmp/web-update
rm -rf /tmp/web-update/*
tar xzf /tmp/sc-web.tar.gz -C /tmp/web-update/

echo '--- [Web] Clean wwwroot (full) ---'
sudo rm -rf ${REMOTE_BASE}/wwwroot/*

echo '--- [Web] Copy new files ---'
sudo cp -r /tmp/web-update/* ${REMOTE_BASE}/wwwroot/

"@
    }
}

if ($doApi) {
    $bashScript += @"

echo '--- [API] Start sc-hearing service ---'
sudo systemctl start sc-hearing
sleep 2
sudo systemctl is-active sc-hearing && echo 'sc-hearing: ACTIVE' || (echo 'sc-hearing: FAILED'; exit 1)

"@
}

if ($doWeb) {
    $bashScript += @"

echo '--- [Web] Permissions ---'
sudo chown -R apache:apache ${REMOTE_BASE}/wwwroot
sudo chmod -R 755 ${REMOTE_BASE}/wwwroot

echo '--- [Web] SELinux context ---'
sudo chcon -R -t httpd_sys_content_t ${REMOTE_BASE}/wwwroot
sudo restorecon -R ${REMOTE_BASE}/wwwroot

echo '--- [Web] Restart httpd ---'
sudo systemctl restart httpd
sleep 1
sudo systemctl is-active httpd && echo 'httpd: ACTIVE' || (echo 'httpd: FAILED'; exit 1)

"@
}

$bashScript += @"

echo '--- Cleanup temp files ---'
rm -rf /tmp/api-update /tmp/web-update /tmp/sc-api.tar.gz /tmp/sc-web.tar.gz 2>/dev/null || true

echo ''
echo '=== Deploy Complete ==='
"@

ssh -i $KEY $EC2 $bashScript
Check-Last "ssh deploy"

Step "5. Cleanup local temp files"
if ($doApi -and (Test-Path $apiArchive)) {
    Remove-Item $apiArchive
    Info "Removed: $apiArchive"
}
if ($doWeb -and (Test-Path $webArchive)) {
    Remove-Item $webArchive
    Info "Removed: $webArchive"
}

$elapsed = (Get-Date) - $startTime
$min = [math]::Floor($elapsed.TotalMinutes)
$sec = [math]::Floor($elapsed.TotalSeconds) % 60

Step "All Done!"
Write-Host "  Total time: ${min}m ${sec}s" -ForegroundColor Green
Write-Host "  URL: http://54.64.46.6/sc-hearing" -ForegroundColor Green
Write-Host ""
