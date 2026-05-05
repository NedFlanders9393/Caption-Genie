#!/usr/bin/env bash
set -e

if [ -z "$ASC_API_KEY_CONTENT" ]; then
  echo "Error: ASC_API_KEY_CONTENT secret is not set"
  exit 1
fi

KEY_PATH="/tmp/AuthKey_88TCF86H75.p8"

# Reconstruct proper PEM with real newlines
node -e "
const raw = process.env.ASC_API_KEY_CONTENT;
const body = raw.replace(/-----BEGIN PRIVATE KEY-----/g,'').replace(/-----END PRIVATE KEY-----/g,'').replace(/\s+/g,'');
const lines = body.match(/.{1,64}/g).join('\n');
const pem = '-----BEGIN PRIVATE KEY-----\n' + lines + '\n-----END PRIVATE KEY-----\n';
require('fs').writeFileSync('$KEY_PATH', pem);
console.log('Key written OK, length:', pem.length);
"
chmod 600 "$KEY_PATH"

EAS_SKIP_AUTO_FINGERPRINT=1 GIT_OPTIONAL_LOCKS=0 EXPO_TOKEN=$EXPO_TOKEN \
  eas submit --platform ios --profile production --non-interactive --latest

rm -f "$KEY_PATH"
