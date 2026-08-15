[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$releaseRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $releaseRoot "project\private_instance\server.json"
if (-not (Test-Path -LiteralPath $statePath)) {
    Write-Output "BoatBoard is not running."
    exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$process = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
if (-not $process) {
    Remove-Item -LiteralPath $statePath -Force
    Write-Output "BoatBoard was not running; the stale server record was removed."
    exit 0
}

$expectedExecutable = [IO.Path]::GetFullPath((Join-Path $releaseRoot "BoatBoard.exe"))
$actualExecutable = [IO.Path]::GetFullPath($process.Path)
if ($actualExecutable -ne $expectedExecutable) {
    throw "The recorded process is not this BoatBoard executable; it was not stopped."
}

Stop-Process -Id $process.Id
Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
Write-Output "BoatBoard stopped."
