$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$venvPy = Join-Path $root ".venv\\Scripts\\python.exe"
if (Test-Path $venvPy) {
  $py = $venvPy
} else {
  $py = "python"
}

& $py -m pip install -r (Join-Path $root "desktop\\requirements.txt")
& $py -m pip install pyinstaller

if (Test-Path (Join-Path $root "dist")) { Remove-Item -Recurse -Force (Join-Path $root "dist") }
if (Test-Path (Join-Path $root "build")) { Remove-Item -Recurse -Force (Join-Path $root "build") }

& $py -m PyInstaller (Join-Path $root "installer\\timetracker.spec") --noconfirm --clean
if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed with exit code $LASTEXITCODE" }

$isccCandidates = @(
  (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\\ISCC.exe"),
  (Join-Path ${env:ProgramFiles} "Inno Setup 6\\ISCC.exe"),
  "ISCC.exe"
)

$iscc = $null
foreach ($c in $isccCandidates) {
  try {
    if ($c -eq "ISCC.exe") {
      $cmd = Get-Command $c -ErrorAction SilentlyContinue
      if ($cmd) { $iscc = $cmd.Source; break }
    } elseif (Test-Path $c) {
      $iscc = $c
      break
    }
  } catch {}
}

if (-not $iscc) {
  throw "Inno Setup compiler (ISCC.exe) not found. Install Inno Setup 6 and re-run this script."
}

$iss = Join-Path $root "installer\\TimeTracker.iss"
$out = Join-Path $root "installer\\output\\TimeTrackerSetup.exe"
if (Test-Path $out) { Remove-Item -Force $out }
& $iscc $iss
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compile failed with exit code $LASTEXITCODE" }
if (-not (Test-Path $out)) {
  throw "Installer build finished but TimeTrackerSetup.exe not found at $out"
}

Write-Output ("Built: " + $out)
