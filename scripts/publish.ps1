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

function Test-GhAuth {
  cmd /c "`"$gh`" auth status >nul 2>&1"
  return $LASTEXITCODE -eq 0
}

function Test-GhRepo {
  param([string]$Slug)
  cmd /c "`"$gh`" repo view `"$Slug`" >nul 2>&1"
  return $LASTEXITCODE -eq 0
}

$repoUrl = "https://github.com/$Owner/$Repo"
$siteUrl = "https://$Owner.github.io/$Repo/"
$remote = "git@github.com:$Owner/$Repo.git"

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin $remote
} else {
  git remote set-url origin $remote
}

# Push works without gh if the repository already exists.
cmd /c "git push -u origin main >nul 2>&1"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Code pushed to $repoUrl"
  Write-Host "Enable Pages: Settings -> Pages -> Source: GitHub Actions"
  Write-Host "Site URL: $siteUrl"
  exit 0
}

if (-not (Test-GhAuth)) {
  Write-Host "GitHub login required to create the repository."
  Write-Host "A browser window will open. Approve access and enter the one-time code."
  & $gh auth login --hostname github.com --git-protocol ssh --web --skip-ssh-key
  if (-not (Test-GhAuth)) {
    throw "GitHub login was not completed."
  }
}

if (-not (Test-GhRepo "$Owner/$Repo")) {
  Write-Host "Creating repository $Owner/$Repo..."
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
Write-Host "Done: $repoUrl"
Write-Host "Enable Pages: Settings -> Pages -> Source: GitHub Actions"
Write-Host "Site URL: $siteUrl"
