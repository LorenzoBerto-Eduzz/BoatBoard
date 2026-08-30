[CmdletBinding()]
param(
    [string]$OutputPath = "exports\BoatBoard-local",
    [string]$PythonPath
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$resolvedOutput = [IO.Path]::GetFullPath((Join-Path $root $OutputPath))
$exportsRoot = [IO.Path]::GetFullPath((Join-Path $root "exports"))
if (-not $resolvedOutput.StartsWith($exportsRoot + [IO.Path]::DirectorySeparatorChar)) {
    throw "Local-release output must stay inside $exportsRoot"
}

$packagingEnvironment = Join-Path $root "build\boatboard-packaging-venv"
$packagingPython = Join-Path $packagingEnvironment "Scripts\python.exe"
$packagingExecutable = Join-Path $packagingEnvironment "Scripts\pyinstaller.exe"
if (-not (Test-Path -LiteralPath $packagingExecutable)) {
    function Find-PackagingPython {
        $candidates = @()
        if ($PythonPath) {
            $candidates += @{ Command = $PythonPath; Prefix = @() }
        }
        $candidates += @(
            @{ Command = "py"; Prefix = @("-3") },
            @{ Command = "python"; Prefix = @() },
            @{ Command = "python3"; Prefix = @() }
        )
        foreach ($candidate in $candidates) {
            $command = Get-Command $candidate.Command -ErrorAction SilentlyContinue
            if (-not $command) { continue }
            $previousPreference = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try {
                $arguments = @($candidate.Prefix) + @("--version")
                & $command.Source @arguments 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    return @{ Command = $command.Source; Prefix = $candidate.Prefix }
                }
            } finally {
                $ErrorActionPreference = $previousPreference
            }
        }
        return $null
    }

    $bootstrapPython = Find-PackagingPython
    if (-not $bootstrapPython) {
        throw "Python 3.11+ is required only to build localrelease. Install Python or pass -PythonPath. Exported users do not need Python."
    }
    $venvArguments = @($bootstrapPython.Prefix) + @("-m", "venv", $packagingEnvironment)
    & $bootstrapPython.Command @venvArguments
    if ($LASTEXITCODE -ne 0) { throw "Could not create the isolated packaging environment." }
    & $packagingPython -m pip install --disable-pip-version-check -r (Join-Path $root "requirements-build.txt")
    if ($LASTEXITCODE -ne 0) { throw "Could not install the isolated packaging dependencies." }
}
$buildDist = Join-Path $root "build\localrelease-dist"
$buildWork = Join-Path $root "build\localrelease-work"
$buildSpec = Join-Path $root "build\localrelease-spec"
& $packagingExecutable --noconfirm --clean --onefile --windowed --name BoatBoard `
    --distpath $buildDist --workpath $buildWork --specpath $buildSpec `
    --hidden-import openpyxl (Join-Path $root "scripts\boatboard_server.py")
if ($LASTEXITCODE -ne 0) { throw "BoatBoard executable packaging failed." }

if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutput | Out-Null
New-Item -ItemType Directory -Path (Join-Path $resolvedOutput "project") | Out-Null

Get-ChildItem -LiteralPath (Join-Path $root "project") -Force |
    Where-Object { $_.Name -ne "private_instance" } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $resolvedOutput "project") -Recurse -Force
    }

# Keep the reserved future control in the development source without presenting
# an inactive button to local-preview users.
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
foreach ($pageName in @("index.html", "editor.html")) {
    $pagePath = Join-Path $resolvedOutput "project\$pageName"
    $pageContent = [IO.File]::ReadAllText($pagePath)
    $pageContent = [Text.RegularExpressions.Regex]::Replace(
        $pageContent,
        '(?m)^\s*<button class="compact-header-placeholder compact-header-future"[^>]*></button>\r?\n',
        ''
    )
    [IO.File]::WriteAllText($pagePath, $pageContent, $utf8WithoutBom)
}

Copy-Item -LiteralPath (Join-Path $buildDist "BoatBoard.exe") -Destination (Join-Path $resolvedOutput "BoatBoard.exe")
Copy-Item -LiteralPath (Join-Path $root "release\README.md") -Destination (Join-Path $resolvedOutput "README.md")
Copy-Item -LiteralPath (Join-Path $root "release\BoatBoard Editor.cmd") -Destination (Join-Path $resolvedOutput "BoatBoard Editor.cmd")
Copy-Item -LiteralPath (Join-Path $root "release\Stop BoatBoard.cmd") -Destination (Join-Path $resolvedOutput "Stop BoatBoard.cmd")
Copy-Item -LiteralPath (Join-Path $root "release\Stop-BoatBoard.ps1") -Destination (Join-Path $resolvedOutput "Stop-BoatBoard.ps1")

if (Test-Path -LiteralPath (Join-Path $resolvedOutput "project\private_instance")) {
    throw "Private instance data was unexpectedly included in the local release."
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedOutput "project\instance_template\boatboard.xlsx"))) {
    throw "The empty instance workbook is missing from the local release."
}
if (-not (Test-Path -LiteralPath (Join-Path $resolvedOutput "BoatBoard.exe"))) {
    throw "The standalone BoatBoard executable is missing from the local release."
}

Write-Output "BoatBoard local preview created at: $resolvedOutput"
