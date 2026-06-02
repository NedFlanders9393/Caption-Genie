---
name: App Store Connect API key — secret format & submit debugging
description: How the ASC_API_KEY_CONTENT secret is stored (no newlines), how to reconstruct a valid .p8, and how to debug EAS iOS submit failures by querying Apple directly.
---

# ASC API key secret format (CRITICAL before any iOS submit)

`ASC_API_KEY_CONTENT` stores the `.p8` as a **single line with spaces where the
newlines should be** — no real newlines and no literal `\n` escapes. The header
(`-----BEGIN PRIVATE KEY-----`) and footer are intact; only the line breaks were
flattened to spaces.

Writing it verbatim (`printf '%s' "$ASC_API_KEY_CONTENT" > key.p8`) produces a
one-line file that OpenSSL **and Apple** reject. EAS submit then fails with the
useless generic error "Something went wrong when submitting your app to Apple App
Store Connect" and EAS captures no logs (`error: null`, `logsUrl: null`).

**Reconstruct a valid PEM** before each submit (tmp is ephemeral): keep header +
footer, strip spaces from the base64 body, re-wrap the body at 64 chars, join with
real newlines. Verify with `openssl pkey -in key.p8 -noout`. eas.json submit
profile points `ascApiKeyPath` at `/tmp/AuthKey_6GZ3K2Z6Y6.p8`.

# Debugging submit auth failures (401)

EAS gives no detail. Query App Store Connect directly with a Node ES256 JWT:
header `{alg:ES256, kid:<keyId>, typ:JWT}`, payload `{iss:<issuerId>, iat, exp,
aud:"appstoreconnect-v1"}`, sign with `crypto.sign("sha256", input, {key:pem,
dsaEncoding:"ieee-p1363"})` (Node has no PyJWT/cryptography; python lacks both).
Hit `GET https://api.appstoreconnect.apple.com/v1/apps/<ascAppId>`.

- **HTTP 401 NOT_AUTHORIZED** with a structurally-valid key + correct kid/issuer/team
  = Apple does not recognize the credentials → the API key was **revoked or
  regenerated** in App Store Connect, or the stored secret no longer matches the
  configured key id. Not fixable from the repl; the user must regenerate the key
  (Users and Access → Integrations → App Store Connect API) and update the secret +
  eas.json (`ascApiKeyId`, `ascApiKeyIssuerId`).
- 403 would mean wrong role; 401 means auth itself failed.

**Why:** a valid `.p8` (OpenSSL parses it, ES256 sign/verify roundtrips) does NOT
prove Apple will accept it — the kid must still map to a live key under that issuer.
