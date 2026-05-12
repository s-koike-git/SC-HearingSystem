# deploy-aws-fast.ps1  高速デプロイ（deploy-aws.ps1 のラッパー）
[CmdletBinding()]
param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipBuild
)

# 文字化け対策
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

& "$PSScriptRoot\deploy-aws.ps1" `
    -FrontendOnly:$FrontendOnly `
    -BackendOnly:$BackendOnly `
    -SkipBuild:$SkipBuild
