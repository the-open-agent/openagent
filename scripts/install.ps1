# OpenAgent one-step install (Windows PowerShell): download the release binary for your platform.
# Usage (run only if you trust this script source):
#   irm https://raw.githubusercontent.com/the-open-agent/openagent/master/scripts/install.ps1 | iex
#
# Optional environment variables:
#   OPENAGENT_VERSION   e.g. v1.777.3  (default: latest release)
#   INSTALL_DIR         installation directory (default: $env:LOCALAPPDATA\openagent)

$ErrorActionPreference = 'Stop'

$Repo    = 'the-open-agent/openagent'
$Version = if ($env:OPENAGENT_VERSION) { $env:OPENAGENT_VERSION } else { 'latest' }
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { "$env:LOCALAPPDATA\openagent" }

function Write-Info { param([string]$Msg) Write-Host $Msg }
function Write-Err  { param([string]$Msg) Write-Host "[openagent] $Msg" -ForegroundColor Red }

# ── resolve version ────────────────────────────────────────────────────────────
if ($Version -eq 'latest') {
    Write-Info 'Fetching latest release version...'
    $release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
    $Version = $release.tag_name
    if (-not $Version) { throw 'Failed to fetch latest version from GitHub API.' }
}
Write-Info "Installing openagent $Version"

# ── detect arch ───────────────────────────────────────────────────────────────
$Arch = (Get-CimInstance Win32_Processor).Architecture
# 0=x86, 5=ARM, 9=x86-64, 12=ARM64
$ArchName = switch ($Arch) {
    9  { 'x86' }
    12 { 'arm64' }
    default { throw "Unsupported architecture ($Arch). Download manually from https://github.com/$Repo/releases" }
}

$Filename = "openagent_windows_${ArchName}.exe"
$Url      = "https://github.com/$Repo/releases/download/$Version/$Filename"

# ── download binary ─────────────────────────────────────────────────────────────
$TmpDir = Join-Path $env:TEMP "openagent_install_$(Get-Random)"
New-Item -ItemType Directory -Path $TmpDir | Out-Null

try {
    $ExePath = Join-Path $TmpDir 'openagent.exe'
    Write-Info "Downloading $Url ..."
    Invoke-WebRequest -Uri $Url -OutFile $ExePath -UseBasicParsing

    # ── install ────────────────────────────────────────────────────────────────
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir | Out-Null
    }

    Write-Info "Installing to $InstallDir ..."
    Copy-Item -Path $ExePath -Destination (Join-Path $InstallDir 'openagent.exe') -Force

    # Record the version so it can be read without running the binary. The release
    # binary is built with -trimpath and packed with UPX, which erases the version
    # from its Go build metadata. WriteAllText writes UTF-8 with no BOM.
    [System.IO.File]::WriteAllText((Join-Path $InstallDir 'version'), "$Version`n")
}
finally {
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}

# ── add to PATH for this session and persistently for the user ─────────────────
$UserPath = [System.Environment]::GetEnvironmentVariable('PATH', 'User')
if ($UserPath -notlike "*$InstallDir*") {
    [System.Environment]::SetEnvironmentVariable('PATH', "$UserPath;$InstallDir", 'User')
    $env:PATH = "$env:PATH;$InstallDir"
    Write-Info "Added $InstallDir to your PATH."
}

Write-Info ''
Write-Info "openagent $Version installed to $InstallDir"
Write-Info ''
Write-Info "For more information visit https://github.com/$Repo"
Write-Info ''
Write-Info 'Starting openagent...'
& (Join-Path $InstallDir 'openagent.exe') serve
