#!/usr/bin/env bash
# list-token-exchange-profiles.sh
#
# Lists all Custom Token Exchange profiles in Auth0.
#
# Usage:
#   cat mgmt-token.txt | ./scripts/list-token-exchange-profiles.sh

set -euo pipefail

if [[ -t 0 ]]; then
  echo "Usage: cat <mgmt-token-file> | $0"
  exit 1
fi

MGMT_TOKEN=$(cat | tr -d '[:space:]')
DOMAIN="${AUTH0_DOMAIN:?AUTH0_DOMAIN is not set}"

response=$(curl -s -w "\n%{http_code}" \
  --request GET \
  --url "https://${DOMAIN}/api/v2/token-exchange-profiles" \
  --header "Authorization: Bearer ${MGMT_TOKEN}")

body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n 1)

if [[ "$status" != "200" ]]; then
  echo "Failed (HTTP ${status}): ${body}"
  exit 1
fi

echo "$body" | python3 -m json.tool
