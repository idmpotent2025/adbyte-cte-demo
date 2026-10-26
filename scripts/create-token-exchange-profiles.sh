#!/usr/bin/env bash
# create-token-exchange-profiles.sh
#
# Creates two Custom Token Exchange profiles in Auth0 — one for the buyer agent
# and one for the publisher agent.
#
# Usage:
#   cat mgmt-token.txt | ./scripts/create-token-exchange-profiles.sh
#
# Required env vars:
#   AUTH0_DOMAIN
#   BUYER_AGENT_ACTION_ID
#   PUBLISHER_AGENT_ACTION_ID
#   BUYER_AGENT_SUBJECT_TOKEN_TYPE    (default: https://admanager.demo/token-type/buyer)
#   PUBLISHER_AGENT_SUBJECT_TOKEN_TYPE (default: https://admanager.demo/token-type/publisher)

set -euo pipefail

# ── Read token from stdin ─────────────────────────────────────────────────────
if [[ -t 0 ]]; then
  echo "Usage: cat <mgmt-token-file> | $0"
  echo "       (pipe the Management API token via stdin to keep it out of shell logs)"
  exit 1
fi

MGMT_TOKEN=$(cat | tr -d '[:space:]')

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN="${AUTH0_DOMAIN:?AUTH0_DOMAIN is not set}"
BUYER_ACTION_ID="${BUYER_AGENT_ACTION_ID:?BUYER_AGENT_ACTION_ID is not set}"
PUBLISHER_ACTION_ID="${PUBLISHER_AGENT_ACTION_ID:?PUBLISHER_AGENT_ACTION_ID is not set}"

BUYER_TOKEN_TYPE="${BUYER_AGENT_SUBJECT_TOKEN_TYPE:-https://admanager.demo/token-type/buyer}"
PUBLISHER_TOKEN_TYPE="${PUBLISHER_AGENT_SUBJECT_TOKEN_TYPE:-https://admanager.demo/token-type/publisher}"

# ── Helper ────────────────────────────────────────────────────────────────────
create_profile() {
  local label="$1"
  local name="$2"
  local token_type="$3"
  local action_id="$4"

  echo "▶  Creating profile: ${label} (${name})..."

  payload=$(cat <<JSON
{
  "name": "${name}",
  "type": "custom_authentication",
  "subject_token_type": "${token_type}",
  "action_id": "${action_id}"
}
JSON
)

  response=$(curl -s -w "\n%{http_code}" \
    --request POST \
    --url "https://${DOMAIN}/api/v2/token-exchange-profiles" \
    --header "Authorization: Bearer ${MGMT_TOKEN}" \
    --header "Content-Type: application/json" \
    --data "${payload}")

  body=$(echo "$response" | sed '$d')
  status=$(echo "$response" | tail -n 1)

  if [[ "$status" == "200" || "$status" == "201" ]]; then
    profile_id=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
    echo "   ✓  ${label} created — id: ${profile_id}"
  else
    echo "   ✗  ${label} failed (HTTP ${status})"
    echo "      ${body}"
    exit 1
  fi
}

# ── Run ───────────────────────────────────────────────────────────────────────
echo ""
echo "Auth0 domain       : ${DOMAIN}"
echo "Buyer token type   : ${BUYER_TOKEN_TYPE}"
echo "Publisher token type: ${PUBLISHER_TOKEN_TYPE}"
echo ""

create_profile \
  "Buyer Agent"   "buyer-agent-exchange-profile"     "$BUYER_TOKEN_TYPE"     "$BUYER_ACTION_ID"

create_profile \
  "Publisher Agent" "publisher-agent-exchange-profile" "$PUBLISHER_TOKEN_TYPE" "$PUBLISHER_ACTION_ID"

echo ""
echo "Done. Both token exchange profiles created."
