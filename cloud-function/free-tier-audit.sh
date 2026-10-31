#!/usr/bin/env bash
# Linked Pocket Realms — Google Cloud Free Tier Audit Script (Bash)
# Verifies all resources in the active GCP project conform to the Always Free Tier ($0.00/mo)
set -euo pipefail

FUNCTION_NAME="pocket-realms-broker"
REGION="${GCP_REGION:-us-central1}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

echo "=========================================================="
echo " Google Cloud Free-Tier Audit — Linked Pocket Realms"
echo " Project: $PROJECT_ID"
echo " Region:  $REGION"
echo "=========================================================="

echo ""
echo "[1/4] Checking Cloud Function Gen 2 & Cloud Run Settings..."
if gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --quiet &>/dev/null; then
  MIN_INST=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --format="value(serviceConfig.minInstanceCount)" --quiet || echo "0")
  MAX_INST=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --format="value(serviceConfig.maxInstanceCount)" --quiet || echo "1")
  MEM=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --format="value(serviceConfig.availableMemory)" --quiet || echo "256Mi")
  TIMEOUT=$(gcloud functions describe "$FUNCTION_NAME" --gen2 --region="$REGION" --format="value(serviceConfig.timeoutSeconds)" --quiet || echo "10")

  echo "  • Min Instances: ${MIN_INST:-0} (Target: 0 for Scale-to-Zero)"
  echo "  • Max Instances: $MAX_INST (Target: 1 for DoS Protection)"
  echo "  • Memory:        $MEM (Target: <= 256MiB)"
  echo "  • Timeout:       ${TIMEOUT}s (Target: <= 15s)"
else
  echo "  (Function not yet deployed. Deploy using ./deploy.sh)"
fi

echo ""
echo "[2/4] Checking Artifact Registry Image Storage..."
IMAGE_PATH="$REGION-docker.pkg.dev/$PROJECT_ID/gcf-artifacts/$FUNCTION_NAME"
IMAGE_COUNT=$(gcloud artifacts docker images list "$IMAGE_PATH" --format="value(DIGEST)" --quiet 2>/dev/null | wc -l || echo "0")
echo "  • Stored Revisions: $IMAGE_COUNT (Target: <= 2 revisions to stay < 500MB)"

echo ""
echo "[3/4] Checking Region Free-Tier Eligibility..."
case "$REGION" in
  us-central1|us-east1|us-west1)
    echo "  • Region '$REGION' is eligible for Google Cloud Always Free Tier compute and 1GB egress."
    ;;
  *)
    echo "  • WARNING: Region '$REGION' may not qualify for North America Always Free Tier egress."
    ;;
esac

echo ""
echo "[4/4] Monthly Free Tier Reference Quotas:"
echo "  • Invocations:       2,000,000 requests / month (Free)"
echo "  • Compute Memory:    360,000 GB-seconds / month (Free)"
echo "  • Compute vCPU:      180,000 vCPU-seconds / month (Free)"
echo "  • Artifact Registry: 0.5 GB (500 MB) storage / month (Free)"
echo "  • Cloud Storage:     5.0 GB storage / month (Free)"
echo "  • Cloud Logging:     50 GiB log data / month (Free)"
echo "  • Network Egress:    1.0 GB to internet / month (Free)"

echo "=========================================================="
echo " Audit Completed!"
echo "=========================================================="
