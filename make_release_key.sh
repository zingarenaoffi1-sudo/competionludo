#!/bin/bash
set -e

# Generate 50-year (18250 days) permanent release keystore
keytool -genkeypair \
  -alias zingarena_release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 18250 \
  -keystore release.keystore \
  -storepass zingarena123 \
  -keypass zingarena123 \
  -dname "CN=ZingArena, OU=MobileGames, O=ZingArena, L=NewDelhi, ST=Delhi, C=IN"

echo "=== FINGERPRINTS ==="
keytool -list -v -keystore release.keystore -alias zingarena_release -storepass zingarena123 | grep -E "(SHA1|SHA256)"

echo "=== ENCODING TO BASE64 ==="
base64 -w 0 release.keystore > release_keystore_base64.txt
echo "DONE! Base64 size: $(wc -c < release_keystore_base64.txt) characters."
