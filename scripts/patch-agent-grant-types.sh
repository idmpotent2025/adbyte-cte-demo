#!/usr/bin/env bash
# patch-agent-grant-types.sh
#
# Adds urn:ietf:params:oauth:grant-type:token-exchange to the Buyer Agent
# and Publisher Agent M2M clients via the Auth0 Management API.
#
# Usage:
#   ./scripts/patch-agent-grant-types.sh <MGMT_API_TOKEN>
#
# Required env vars (or set them below):
#   AUTH0_DOMAIN
#   BUYER_AGENT_CLIENT_ID
#   PUBLISHER_AGENT_CLIENT_ID

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
# Read token from stdin (pipe a file to avoid token appearing in shell history/logs)
#   cat token.txt | ./scripts/patch-agent-grant-types.sh
if [[ -t 0 ]]; then
  echo "Usage: cat <token-file> | $0"
  echo "       (pipe the Management API token via stdin to keep it out of shell logs)"
  exit 1
fi

MGMT_TOKEN=$(cat | tr -d '[:space:]')

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN="${AUTH0_DOMAIN:?AUTH0_DOMAIN is not set}"
BUYER_ID="${BUYER_AGENT_CLIENT_ID:?BUYER_AGENT_CLIENT_ID is not set}"
PUBLISHER_ID="${PUBLISHER_AGENT_CLIENT_ID:?PUBLISHER_AGENT_CLIENT_ID is not set}"

TOKEN_EXCHANGE_GRANT="urn:ietf:params:oauth:grant-type:token-exchange"
PAYLOAD='{"grant_types":["client_credentials","'"${TOKEN_EXCHANGE_GRANT}"'"]}'

# ── Helper ────────────────────────────────────────────────────────────────────
patch_client() {
  local label="$1"
  local client_id="$2"

  echo "▶  Patching ${label} (${client_id})..."

  response=$(curl -s -w "\n%{http_code}" \
    -X PATCH "https://${DOMAIN}/api/v2/clients/${client_id}" \
    -H "Authorization: Bearer ${MGMT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}")

  body=$(echo "$response" | sed '$d')
  status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" ]]; then
    granted=$(echo "$body" | grep -o '"grant_types":\[[^]]*\]' || echo "(could not parse)")
    echo "   ✓  ${label} updated — ${granted}"
  else
    echo "   ✗  ${label} failed (HTTP ${status})"
    echo "      ${body}"
    exit 1
  fi
}

# ── Run ───────────────────────────────────────────────────────────────────────
echo ""
echo "Auth0 domain : ${DOMAIN}"
echo "Grant to add : ${TOKEN_EXCHANGE_GRANT}"
echo ""

patch_client "Buyer Agent Client"     "$BUYER_ID"
patch_client "Publisher Agent Client" "$PUBLISHER_ID"

echo ""
echo "Done. Both clients now have client_credentials + token-exchange grant types."
