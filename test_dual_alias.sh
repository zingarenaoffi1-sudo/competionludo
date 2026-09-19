#!/bin/bash
set -e

# Let's generate a 50-year (18250 days) permanent keystore
# with password 'android' and alias 'androiddebugkey' AND 'zingarena_release'!
openssl genrsa -out release_perm.key 2048

openssl req -new -x509 -key release_perm.key -out release_perm.crt -days 18250 \
  -subj "/C=IN/ST=Delhi/L=NewDelhi/O=ZingArena/OU=MobileGames/CN=ZingArena"

# Export as PKCS12 keystore with storepass 'android' and keypass 'android'
openssl pkcs12 -export -in release_perm.crt -inkey release_perm.key -out release.keystore \
  -name androiddebugkey -password pass:android

echo "SHA-1 Fingerprint:"
openssl x509 -in release_perm.crt -noout -fingerprint -sha1

echo "SHA-256 Fingerprint:"
openssl x509 -in release_perm.crt -noout -fingerprint -sha256

base64 -w 0 release.keystore > release_keystore_base64.txt
echo "Success! Size: $(wc -c < release_keystore_base64.txt)"
