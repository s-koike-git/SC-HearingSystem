param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipBuild
)

$sshKey = "D:\TEMP\AWS\tcs_dev_2023.pem"
$server = "ec2-user@54.64.46.6"

$localRoot = "C:\Projects\SC-HearingSystem"
$frontend  = "$localRoot\sc-hearing-web"
$backend   = "$localRoot\SCHearing.API"
$dbLocal   = "$backend\App.db"

$remoteRoot = "/var/www/sc-hearing"
$remoteWeb  = "$remoteRoot/wwwroot"
$remoteDB   = "$remoteRoot/data/SCHearing.db"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"

# =========================
# Frontend
# =========================
if (-not $BackendOnly) {

    if (-not $SkipBuild) {
        cd $frontend
        if (-not (Test-Path node_modules)) { npm install }
        npm run build
        if ($LASTEXITCODE -ne 0) { exit 1 }
    }

    $dist = "$frontend\dist"
    if (-not (Test-Path $dist)) { exit 1 }


$backupCmd = @"
cd $remoteRoot &&
sudo mkdir -p backups &&
sudo tar czf backups/wwwroot_$ts.tar.gz wwwroot 2>/dev/null || echo ok
"@

    ssh -i $sshKey $server $backupCmd

    ssh -i $sshKey $server "rm -rf /tmp/sc-dist"
    scp -i $sshKey -r $dist "${server}:/tmp/sc-dist"

$deployCmd = @"
sudo rm -rf $remoteWeb/* &&
sudo mv /tmp/sc-dist/* $remoteWeb/ &&
sudo chown -R apache:apache $remoteWeb &&
sudo chmod -R 755 $remoteWeb
"@
    ssh -i $sshKey $server $deployCmd
}

# =========================
# Backend(DB)
# =========================
if (-not $FrontendOnly) {

    $db = Get-Item $dbLocal
    Write-Host ("DB: {0} ({1} KB)" -f $db.Name, [math]::Round($db.Length / 1024, 2))


$backupDbCmd = @"
cd $remoteRoot/data &&
sudo cp SCHearing.db SCHearing_$ts.db
"@

    ssh -i $sshKey $server "bash -c '$($backupCmd -replace "`r", "")'"

    scp -i $sshKey $dbLocal "${server}:/tmp/App_new.db"

$deployDbCmd = @"
sudo systemctl stop sc-hearing.service &&
sudo cp /tmp/App_new.db $remoteDB &&
sudo chown ec2-user:ec2-user $remoteDB &&
sudo chmod 644 $remoteDB &&
sudo systemctl start sc-hearing.service
"@
    ssh -i $sshKey $server $deployDbCmd
}

Write-Host "🎉 Deploy Complete"