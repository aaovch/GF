param(
  [string]$Owner = "aaovch",
  [string]$Repo = "GF"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$gh = Join-Path $root ".tools\gh\bin\gh.exe"
if (-not (Test-Path $gh)) {
  throw "GitHub CLI not found at $gh. Re-run setup or install gh."
}

& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub login required."
  & $gh auth login --hostname github.com --git-protocol ssh --web
}

$remote = "git@github.com:${Owner}/${Repo}.git"
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $remote
} else {
  git remote set-url origin $remote
}

$exists = & $gh repo view "${Owner}/${Repo}" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Creating repository ${Owner}/${Repo}..."
  & $gh repo create $Repo --public --source . --remote origin --push
} else {
  Write-Host "Repository already exists, pushing..."
  git push -u origin main
}

Write-Host ""
Write-Host "Done: https://github.com/${Owner}/${Repo}"
Write-Host "Enable Pages: Settings -> Pages -> Source: GitHub Actions"
Write-Host "Site URL: https://${Owner}.github.io/${Repo}/"
