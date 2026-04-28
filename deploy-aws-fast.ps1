[CmdletBinding()]
param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipBuild
)

$params = @{
    SkipScreenViewer = $true
    FrontendOnly     = $FrontendOnly
    BackendOnly      = $BackendOnly
    SkipBuild        = $SkipBuild
}

& "$PSScriptRoot\deploy-aws.ps1" @params
