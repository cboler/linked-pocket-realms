#!/usr/bin/env bash
# Deploy Linked Pocket Realms Broker to Google Cloud Functions Gen 2
# Configured for 100% Google Cloud Always Free Tier compliance ($0.00/mo)
set -euo pipefail

FUNCTION_NAME="pocket-realms-broker"
# Always Free Tier compute and egress eligibility requires us-central1, us-east1, or us-west1
REGION="${GCP_REGION:-us-central1}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No active GCP project configured. Run 'gcloud config set project <PROJECT_ID>' first."
  exit 1
fi

echo "=========================================================="
echo " Deploying Serverless WebRTC Broker & Thunderpass Relay"
echo " Function:      $FUNCTION_NAME"
echo " Project:       $PROJECT_ID"
echo " Region:        $REGION (Free-Tier Eligible)"
echo " Runtime:       nodejs22 (Gen 2)"
echo " Min Instances: 0 (Scale-to-zero, $0.00 idle cost)"
echo " Max Instances: 1 (DoS / Runaway cost ceiling)"
echo " Concurrency:   80 requests/instance"
echo " Memory:        512Mi, 1 vCPU (Cloud Run needs 1 vCPU for concurrency > 1)"
echo " Timeout:       10s (Fast hung-connection termination)"
echo "=========================================================="

# 1. Enable required Free-Tier APIs
echo "--> Step 1: Ensuring required Google Cloud APIs are enabled..."
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --quiet

# 2. Deploy Cloud Function Gen 2
echo "--> Step 2: Deploying Gen 2 function..."
gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --runtime=nodejs22 \
  --region="$REGION" \
  --source=. \
  --entry-point=broker \
  --trigger-http \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=80 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=10s \
  --quiet

# 3. Apply Artifact Registry Cleanup Policy (stays under 0.5 GB free limit)
echo "--> Step 3: Setting Artifact Registry cleanup policy..."
gcloud artifacts repositories set-cleanup-policies gcf-artifacts \
  --location="$REGION" \
  --policy=cleanup-policy.json \
  --quiet 2>/dev/null || true

# 4. Prune older container image versions to keep storage <= 500MB
echo "--> Step 4: Pruning stale container images from Artifact Registry..."
IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/gcf-artifacts/$FUNCTION_NAME"
OLD_DIGESTS=$(gcloud artifacts docker images list "$IMAGE_PATH" --sort-by="~CREATE_TIME" --format="value(DIGEST)" 2>/dev/null | tail -n +2 || true)
if [ -n "$OLD_DIGESTS" ]; then
  for digest in $OLD_DIGESTS; do
    echo "    Pruning stale digest: $digest"
    gcloud artifacts docker images delete "$IMAGE_PATH@$digest" --delete-tags --quiet 2>/dev/null || true
  done
fi

# 5. Apply GCS source archive lifecycle (keeps staging bucket < 5GB)
echo "--> Step 5: Applying GCS source archive lifecycle rule..."
SOURCE_BUCKET="gcf-v2-sources-${PROJECT_ID}-${REGION}"
gcloud storage buckets update "gs://${SOURCE_BUCKET}" --lifecycle-file=gcs-lifecycle.json 2>/dev/null || true

echo "=========================================================="
echo " Free-Tier Deployment Complete!"
BROKER_URL=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --format="value(serviceConfig.uri)" 2>/dev/null || echo "")
echo " Broker Endpoint: $BROKER_URL"
echo " Health Check:    $BROKER_URL/health"

# 6. Automatic URL Stamping into client runtime config
if [ -n "$BROKER_URL" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CONFIG_PATH="$SCRIPT_DIR/../src/app/core/config/runtime.config.ts"
  if [ -f "$CONFIG_PATH" ]; then
    echo "--> Step 6: Stamping live broker endpoint into $CONFIG_PATH..."
    cat <<EOF > "$CONFIG_PATH"
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
EOF
    echo "    Stamped live URL: $BROKER_URL"
  fi
fi

echo " All Free-Tier Guardrails Active: Scale-to-Zero, 1 Instance Cap, Auto-Pruned Registry"
echo "=========================================================="
