param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipBuild,
    [switch]$InitDb
)

$sshKey = "D:\TEMP\AWS\tcs_dev_2023.pem"
$server = "ec2-user@54.64.46.6"

$localRoot = "C:\Projects\SC-HearingSystem"
$frontend  = "$localRoot\sc-hearing-web"
$backend   = "$localRoot\SCHearing.API"

$dbLocal       = "$backend\App.db"
$dbDeployLocal = "$backend\App_deploy.db"

$remoteRoot = "/var/www/sc-hearing"
$remoteWeb  = "$remoteRoot/wwwroot"
$remoteDB   = "$remoteRoot/data/SCHearing.db"

$ts = Get-Date -Format "yyyyMMdd_HHmmss"

# -------------------------
# Frontend
# -------------------------
if (-not $BackendOnly) {

    if (-not $SkipBuild) {
        Set-Location $frontend
        if (-not (Test-Path node_modules)) { npm install }
        npm run build
        if ($LASTEXITCODE -ne 0) { exit 1 }
    }

    $dist = "$frontend\dist"
    if (-not (Test-Path $dist)) { exit 1 }

    $cmd = @(
        "cd $remoteRoot",
        "sudo mkdir -p backups",
        "sudo tar czf backups/wwwroot_$ts.tar.gz wwwroot 2>/dev/null || true"
    ) -join "`n"

    ssh -i $sshKey $server "bash -c '$cmd'"

    ssh -i $sshKey $server "rm -rf /tmp/sc-dist"
    scp -i $sshKey -r $dist "${server}:/tmp/sc-dist"

    $cmd = @(
        "sudo rm -rf $remoteWeb/*",
        "sudo mv /tmp/sc-dist/* $remoteWeb/",
        "sudo chown -R apache:apache $remoteWeb",
        "sudo chmod -R 755 $remoteWeb"
    ) -join "`n"

    ssh -i $sshKey $server "bash -c '$cmd'"
}

# -------------------------
# Backend DB
# -------------------------
if (-not $FrontendOnly) {

    Write-Host "DB deploy mode: $InitDb"

    if ($InitDb) {

        Write-Host "WARNING: Production DB will be replaced"
        $confirm = Read-Host "Type YES to continue"
        if ($confirm -ne "YES") { exit }

        if (Test-Path $dbDeployLocal) {
            Remove-Item $dbDeployLocal -Force
        }

        & "C:\Projects\SC-HearingSystem\sqlite\sqlite3.exe" $dbLocal ".backup '$dbDeployLocal'"
        if (-not (Test-Path $dbDeployLocal)) {
            throw "Failed to create deploy DB"
        }

        ssh -i $sshKey $server "sudo systemctl stop sc-hearing.service"

        $cmd = @(
            "cd $remoteRoot/data",
            "sudo cp SCHearing.db SCHearing.db.bak_$ts"
        ) -join "`n"

        ssh -i $sshKey $server "bash -c '$cmd'"

        scp -i $sshKey $dbDeployLocal "${server}:/tmp/SCHearing.db"

        $cmd = @(
            "sudo cp /tmp/SCHearing.db $remoteDB",
            "sudo chown ec2-user:ec2-user $remoteDB",
            "sudo chmod 644 $remoteDB",
            "sudo systemctl start sc-hearing.service"
        ) -join "`n"

        ssh -i $sshKey $server "bash -c '$cmd'"
    }
}

Write-Host "Deploy Complete"