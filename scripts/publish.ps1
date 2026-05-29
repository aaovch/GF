param(
  [string]$Owner = "aaovch",
  [string]$Repo = "GF"
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$gh = Join-Path $root ".tools\gh\bin\gh.exe"
if (-not (Test-Path $gh)) {
  throw "GitHub CLI not found at $gh."
}

function Invoke-Gh {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $gh @Args 2>&1 | Out-Null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  return $code
}

$remote = "git@github.com:${Owner}/${Repo}.git"
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $remote
} else {
  git remote set-url origin $remote
}

# Try push first if repo already exists (SSH only, no gh token needed).
$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
git ls-remote origin refs/heads/main 2>&1 | Out-Null
$remoteReachable = $LASTEXITCODE -eq 0
if (-not $remoteReachable) {
  git push -u origin main 2>&1 | Out-Null
  $remoteReachable = $LASTEXITCODE -eq 0
}
$ErrorActionPreference = $prev

if ($remoteReachable) {
  Write-Host "Code pushed to https://github.com/${Owner}/${Repo}"
  Write-Host "Enable Pages: Settings -> Pages -> Source: GitHub Actions"
  Write-Host "Site URL: https://${Owner}.github.io/${Repo}/"
  exit 0
}

if ((Invoke-Gh auth status) -ne 0) {
  Write-Host "GitHub login required to create the repository."
  Write-Host "A browser window will open — approve access and enter the one-time code."
  & $gh auth login --hostname github.com --git-protocol ssh --web
  if ((Invoke-Gh auth status) -ne 0) {
    throw "GitHub login was not completed."
  }
}

if ((Invoke-Gh repo view "${Owner}/${Repo}") -ne 0) {
  Write-Host "Creating repository ${Owner}/${Repo}..."
  & $gh repo create $Repo --public --source . --remote origin --push
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create repository."
  }
} else {
  Write-Host "Repository exists, pushing..."
  git push -u origin main
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to push to origin."
  }
}

Write-Host ""
Write-Host "Done: https://github.com/${Owner}/${Repo}"
Write-Host "Enable Pages: Settings -> Pages -> Source: GitHub Actions"
Write-Host "Site URL: https://${Owner}.github.io/${Repo}/"
