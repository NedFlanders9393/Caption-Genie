#!/usr/bin/env bash
set -e

if [ -z "$ASC_API_KEY_CONTENT" ]; then
  echo "Error: ASC_API_KEY_CONTENT secret is not set"
  exit 1
fi

KEY_PATH="/tmp/AuthKey_88TCF86H75.p8"
echo "$ASC_API_KEY_CONTENT" > "$KEY_PATH"
chmod 600 "$KEY_PATH"

EAS_SKIP_AUTO_FINGERPRINT=1 GIT_OPTIONAL_LOCKS=0 EXPO_TOKEN=$EXPO_TOKEN \
  eas submit --platform ios --profile production --non-interactive --latest

rm -f "$KEY_PATH"
