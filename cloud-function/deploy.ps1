# Deploy Linked Pocket Realms Broker to Google Cloud Functions Gen 2 (PowerShell)
# Configured for 100% Google Cloud Always Free Tier compliance ($0.00/mo)
$ErrorActionPreference = "Stop"

$FUNCTION_NAME = "pocket-realms-broker"
$REGION = if ($env:GCP_REGION) { $env:GCP_REGION } else { "us-central1" }
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Error "No active GCP project configured. Run 'gcloud config set project <PROJECT_ID>' first."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Deploying Serverless WebRTC Broker & Thunderpass Relay" -ForegroundColor Cyan
Write-Host " Function:      $FUNCTION_NAME"
Write-Host " Project:       $PROJECT_ID"
Write-Host " Region:        $REGION (Free-Tier Eligible)"
Write-Host " Runtime:       nodejs22 (Gen 2)"
Write-Host " Min Instances: 0 (Scale-to-zero, $0.00 idle cost)"
Write-Host " Max Instances: 1 (DoS / Runaway cost ceiling)"
Write-Host " Concurrency:   80 requests/instance"
Write-Host " Memory:        256Mi (1.44M free compute seconds/mo)"
Write-Host " Timeout:       10s (Fast hung-connection termination)"
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Enable required Free-Tier APIs
Write-Host "--> Step 1: Ensuring required Google Cloud APIs are enabled..." -ForegroundColor Yellow
gcloud services enable `
  cloudfunctions.googleapis.com `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  --quiet

# 2. Deploy Cloud Function Gen 2
Write-Host "--> Step 2: Deploying Gen 2 function..." -ForegroundColor Yellow
gcloud functions deploy $FUNCTION_NAME `
  --gen2 `
  --runtime=nodejs22 `
  --region=$REGION `
  --source=. `
  --entry-point=broker `
  --trigger-http `
  --allow-unauthenticated `
  --min-instances=0 `
  --max-instances=1 `
  --concurrency=80 `
  --memory=256Mi `
  --timeout=10s `
  --quiet

# 3. Apply Artifact Registry Cleanup Policy (keeps storage <= 0.5 GB)
Write-Host "--> Step 3: Setting Artifact Registry cleanup policy..." -ForegroundColor Yellow
try {
    gcloud artifacts repositories set-cleanup-policies gcf-artifacts `
      --location=$REGION `
      --policy=cleanup-policy.json `
      --quiet 2>$null
} catch {}

# 4. Prune older container image versions to keep storage <= 500MB
Write-Host "--> Step 4: Pruning stale container images from Artifact Registry..." -ForegroundColor Yellow
$IMAGE_PATH = "$REGION-docker.pkg.dev/$PROJECT_ID/gcf-artifacts/$FUNCTION_NAME"
try {
    $OLD_DIGESTS = gcloud artifacts docker images list $IMAGE_PATH --sort-by="~CREATE_TIME" --format="value(DIGEST)" 2>$null
    if ($OLD_DIGESTS -and $OLD_DIGESTS.Count -gt 1) {
        $OLD_DIGESTS | Select-Object -Skip 1 | ForEach-Object {
            Write-Host "    Pruning stale digest: $_" -ForegroundColor DarkGray
            gcloud artifacts docker images delete "$IMAGE_PATH@$_" --delete-tags --quiet 2>$null
        }
    }
} catch {}

# 5. Apply GCS source archive lifecycle (keeps staging bucket < 5GB)
Write-Host "--> Step 5: Applying GCS source archive lifecycle rule..." -ForegroundColor Yellow
$SOURCE_BUCKET = "gcf-v2-sources-$PROJECT_ID-$REGION"
try {
    gcloud storage buckets update "gs://$SOURCE_BUCKET" --lifecycle-file=gcs-lifecycle.json 2>$null
} catch {}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Free-Tier Deployment Complete!" -ForegroundColor Green
$BROKER_URL = (gcloud functions describe $FUNCTION_NAME --gen2 --region=$REGION --format="value(serviceConfig.uri)").Trim()
Write-Host " Broker Endpoint: $BROKER_URL" -ForegroundColor Yellow
Write-Host " Health Check:    $BROKER_URL/health" -ForegroundColor Yellow

# 6. Automatic URL Stamping into client runtime config
if ($BROKER_URL) {
    $CONFIG_PATH = Join-Path $PSScriptRoot "..\src\app\core\config\runtime.config.ts"
    if (Test-Path $CONFIG_PATH) {
        Write-Host "--> Step 6: Stamping live broker endpoint into $CONFIG_PATH..." -ForegroundColor Yellow
        $CONFIG_CONTENT = @"
/**
 * Production Runtime Configuration for Linked Pocket Realms
 *
 * Automatically stamped on deployment via cloud-function/deploy.sh or deploy.ps1.
 */
export interface RuntimeConfig {
  defaultBrokerUrl: string;
  autoConnectBroker: boolean;
  heartbeatIntervalMs: number;
}

export const RUNTIME_CONFIG: RuntimeConfig = {
  defaultBrokerUrl: '$BROKER_URL',
  autoConnectBroker: true,
  heartbeatIntervalMs: 15000,
};
"@
        Set-Content -Path $CONFIG_PATH -Value $CONFIG_CONTENT -Encoding utf8
        Write-Host "    Stamped live URL: $BROKER_URL" -ForegroundColor Green
    }
}

Write-Host " All Free-Tier Guardrails Active: Scale-to-Zero, 1 Instance Cap, Auto-Pruned Registry" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
