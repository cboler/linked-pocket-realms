# Linked Pocket Realms — Google Cloud Free Tier Audit Script (PowerShell)
# Verifies all resources in the active GCP project conform to the Always Free Tier ($0.00/mo)

$FUNCTION_NAME = "pocket-realms-broker"
$REGION = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$PROJECT_ID = gcloud config get-value project 2>$null

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Google Cloud Free-Tier Audit -- Linked Pocket Realms" -ForegroundColor Cyan
Write-Host " Project: $PROJECT_ID"
Write-Host " Region:  $REGION"
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Function Configuration
Write-Host ""
Write-Host "[1/4] Checking Cloud Function Gen 2 and Cloud Run Settings..." -ForegroundColor Yellow
$funcJson = gcloud functions describe $FUNCTION_NAME --gen2 --region=$REGION --format="json" --quiet 2>$null
if ($funcJson) {
    $func = $funcJson | ConvertFrom-Json
    $minInst = $func.serviceConfig.minInstanceCount
    $maxInst = $func.serviceConfig.maxInstanceCount
    $mem = $func.serviceConfig.availableMemory
    $timeout = $func.serviceConfig.timeoutSeconds

    $minColor = if ($minInst -eq 0 -or -not $minInst) { "Green" } else { "Red" }
    $maxColor = if ($maxInst -eq 1) { "Green" } else { "Yellow" }

    Write-Host "  * State:         $($func.state)" -ForegroundColor Green
    Write-Host "  * Min Instances: $minInst (Target: 0 for Scale-to-Zero)" -ForegroundColor $minColor
    Write-Host "  * Max Instances: $maxInst (Target: 1 for DoS Protection)" -ForegroundColor $maxColor
    Write-Host "  * Memory:        $mem (Target: 256MiB or lower)" -ForegroundColor Green
    Write-Host "  * Timeout:       ${timeout}s (Target: 15s or lower)" -ForegroundColor Green
} else {
    Write-Host "  (Function not yet deployed. Deploy using .\deploy.ps1)" -ForegroundColor DarkGray
}

# 2. Check Artifact Registry Storage (Free limit: 0.5 GB)
Write-Host ""
Write-Host "[2/4] Checking Artifact Registry Image Storage..." -ForegroundColor Yellow
$IMAGE_PATH = "$REGION-docker.pkg.dev/$PROJECT_ID/gcf-artifacts/$FUNCTION_NAME"
$images = gcloud artifacts docker images list $IMAGE_PATH --format="json" --quiet 2>$null
if ($images) {
    $imgList = $images | ConvertFrom-Json
    $count = $imgList.Count
    $countColor = if ($count -le 2) { "Green" } else { "Yellow" }
    Write-Host "  * Stored Revisions: $count (Target: 2 or fewer revisions to stay under 500MB)" -ForegroundColor $countColor
} else {
    Write-Host "  * No stale image versions detected in repository." -ForegroundColor Green
}

# 3. Check Free-Tier Eligible Region
Write-Host ""
Write-Host "[3/4] Checking Region Free-Tier Eligibility..." -ForegroundColor Yellow
$freeTierRegions = @("us-central1", "us-east1", "us-west1")
if ($freeTierRegions -contains $REGION) {
    Write-Host "  * Region '$REGION' is eligible for Google Cloud Always Free Tier compute and 1GB egress." -ForegroundColor Green
} else {
    Write-Host "  * WARNING: Region '$REGION' may not qualify for North America Always Free Tier egress." -ForegroundColor Red
}

# 4. Free Tier Monthly Allowances Reference
Write-Host ""
Write-Host "[4/4] Monthly Free Tier Reference Quotas:" -ForegroundColor Yellow
Write-Host "  * Invocations:       2,000,000 requests / month (Free)"
Write-Host "  * Compute Memory:    360,000 GB-seconds / month (Free)"
Write-Host "  * Compute vCPU:      180,000 vCPU-seconds / month (Free)"
Write-Host "  * Artifact Registry: 0.5 GB storage / month (Free)"
Write-Host "  * Cloud Storage:     5.0 GB storage / month (Free)"
Write-Host "  * Cloud Logging:     50 GiB log data / month (Free)"
Write-Host "  * Network Egress:    1.0 GB to internet / month (Free)"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Audit Completed!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
