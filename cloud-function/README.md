# Linked Pocket Realms — Google Cloud Function Broker

This directory contains the self-contained, **100% Google Cloud Always Free Tier** Gen 2 broker powering:

1. **WebRTC Signaling & 1-Click Lobby Discovery**: In-memory ephemeral exchange of SDP Offers, Answers, and ICE candidates without manual copy-pasting (5-minute TTL).
2. **Zero-Knowledge "Thunderpass" Proximity Relay**: Proximity spore matching keyed by privacy-blinded SHA-256 geohashes (6-hour TTL).

---

## Google Cloud Always Free Tier Architecture ($0.00 / Month)

To guarantee you are **never charged** for running this broker, the architecture adheres to the following invariant guardrails:

| Free Tier Quota               | Monthly Allowance       | Broker Configuration                | Why This Guarantees $0.00                                                                                     |
| :---------------------------- | :---------------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Invocations**               | 2,000,000 requests / mo | Scale-to-zero                       | Normal delve & streetpass sessions use < 1% of the monthly 2M free allowance.                                 |
| **Compute Memory**            | 360,000 GB-seconds / mo | `--memory=256Mi`                    | 256Mi allows **1,440,000 seconds of execution time** per month. Average request takes ~15ms.                  |
| **Idle Cost**                 | $0.00                   | `--min-instances=0`                 | Container automatically scales to **0 instances** when inactive. Zero compute or memory is billed while idle. |
| **DoS / Runaway Protection**  | N/A                     | `--max-instances=1`                 | Hard ceiling of **1 instance** prevents traffic spikes or bots from scaling out and incurring charges.        |
| **Instance Concurrency**      | N/A                     | `--concurrency=80`                  | Single instance serves up to 80 simultaneous requests without spinning up extra containers.                   |
| **Timeout Protection**        | N/A                     | `--timeout=10s`                     | Hung or stalled connections terminate immediately in 10s to prevent burning compute seconds.                  |
| **Artifact Registry Storage** | 0.5 GB (500 MB) / mo    | Automated cleanup & digest pruning  | After each deploy, `deploy.sh` prunes older image digests to keep storage well below 500 MB.                  |
| **Cloud Storage Staging**     | 5.0 GB / mo             | 2-day lifecycle deletion rule       | Staging source zips are automatically deleted after 2 days via `gcs-lifecycle.json`.                          |
| **Process Memory**            | 256 MB max              | LRU bounded maps + 32KB payload cap | Sessions capped at 200, zones at 400, spores at 8/cell. Process memory stays < 30 MB.                         |
| **Network Egress**            | 1.0 GB / mo to internet | Compact JSON + client caching       | Responses are compact JSON (< 1 KB). Egress stays in megabytes even under heavy use.                          |
| **Eligible Region**           | US Regions only         | `us-central1`                       | Compute and network egress Always Free Tier requires `us-central1`, `us-east1`, or `us-west1`.                |

---

## Deployment Instructions

### Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated:
  ```bash
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  ```

### Deploying via Automated Free-Tier Script

The scripts enable required APIs, configure concurrency, set min/max instances, and prune older container images:

- **Linux / macOS**:
  ```bash
  cd cloud-function
  chmod +x deploy.sh free-tier-audit.sh
  ./deploy.sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  cd cloud-function
  .\deploy.ps1
  ```

---

## Free-Tier Verification & Audit Tool

Verify that your active deployment conforms to every Always Free Tier guardrail at any time:

- **PowerShell**:
  ```powershell
  cd cloud-function
  .\free-tier-audit.ps1
  ```
- **Bash**:
  ```bash
  cd cloud-function
  ./free-tier-audit.sh
  ```

The audit tool checks:

1. `min-instances=0` (scale-to-zero active)
2. `max-instances=1` (concurrency runaway cap active)
3. Available memory (<= 256Mi)
4. Artifact Registry image count (<= 2 versions stored)
5. Region eligibility (`us-central1`)

---

## Endpoints

| Method | Path                               | Cache-Control        | Description                                                                  |
| :----- | :--------------------------------- | :------------------- | :--------------------------------------------------------------------------- |
| `GET`  | `/health`                          | `public, max-age=60` | Service health status, uptime, active session counts, and memory.            |
| `GET`  | `/sessions`                        | `public, max-age=2`  | Lists active public/friend lobby sessions (5-min TTL).                       |
| `POST` | `/signal`                          | `no-store`           | Exchanges an SDP offer, answer, or ICE candidate for a room code (32KB cap). |
| `GET`  | `/signal?roomCode=XYZ&sinceMs=123` | `no-store`           | Polls pending signals for a room code.                                       |
| `POST` | `/thunderpass`                     | `no-store`           | Posts a blinded `zoneHash` and `sporePayload`, returning matches (6-hr TTL). |
