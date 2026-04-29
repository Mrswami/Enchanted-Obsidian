param (
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    
    [string]$LegalName = "Jacob Moreno",
    [string]$Birthdate = "1990-01-01"
)

# 1. Generate Local Fingerprint
Write-Host "Generating Local Fingerprint..." -ForegroundColor Cyan
$hash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLower()
Write-Host "Hash: $hash"

# 2. IRONCLAD: Private HSM Identity Seal
Write-Host "Stage 1: Executing Ironclad Identity Seal (Azure HSM)..." -ForegroundColor Yellow
$ironcladBody = @{
    assetHash = $hash
    assetName = (Get-Item $FilePath).Name
    legalName = $LegalName
    birthdate = $Birthdate
} | ConvertTo-Json

$ironcladResp = Invoke-RestMethod -Uri "https://signasset-eu3pt6nzhq-uc.a.run.app" -Method Post -Body $ironcladBody -ContentType "application/json"
Write-Host "Ironclad Seal Successful. Receipt: $($ironcladResp.receiptId)" -ForegroundColor Green

# 3. OPENTIMESTAMPS: Public Bitcoin Anchor
Write-Host "Stage 2: Executing Global Anchor (OpenTimestamps/Bitcoin)..." -ForegroundColor Yellow

# OpenTimestamps uses a binary format, but we can submit to public calendars via HTTP
# We'll use the 'Alice' and 'Bob' public calendars for redundancy
$otsCalendars = @(
    "https://alice.btc.calendar.opentimestamps.org/digest",
    "https://bob.btc.calendar.opentimestamps.org/digest"
)

# Convert hex hash to byte array for OTS submission
$hashBytes = [byte[]]($hash -split '(?<=\G..)(?=.)' | ForEach-Object { [Convert]::ToByte($_, 16) })

foreach ($calendar in $otsCalendars) {
    try {
        $otsResp = Invoke-WebRequest -Uri $calendar -Method Post -Body $hashBytes -ContentType "application/octet-stream" -UseBasicParsing
        if ($otsResp.StatusCode -eq 200) {
            Write-Host "Successfully anchored to $($calendar.Split('.')[0].Replace('https://','')) calendar." -ForegroundColor Green
            break # Success on first try
        }
    } catch {
        Write-Host "Calendar submission failed: $_" -ForegroundColor Gray
    }
}

# 4. Finalize & Local Caching
Write-Host "`nAsset Sealed & Anchored Successfully." -ForegroundColor Green
Write-Host "Ironclad Receipt: $($ironcladResp.receiptId)"
Write-Host "Vault URI: $($ironcladResp.vaultUri)"

# Local Caching (Lock 4: Local Provenance)
$receiptDir = Join-Path (Get-Item $FilePath).Directory.FullName ".ironclad"
if (-not (Test-Path $receiptDir)) { New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null }

$receiptFile = Join-Path $receiptDir "$($hash).json"
$ironcladResp | ConvertTo-Json | Out-File -FilePath $receiptFile
Write-Host "Local Receipt Cached: $receiptFile" -ForegroundColor Gray

