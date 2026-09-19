#!/bin/bash
set -e

# Generate RSA private key (2048 bit)
openssl genrsa -out final_release.key 2048

# Generate 50-year (18250 days) Self-Signed Certificate for ZingArena
openssl req -new -x509 -key final_release.key -out final_release.crt -days 18250 \
  -subj "/C=IN/ST=Delhi/L=NewDelhi/O=ZingArena/OU=MobileGames/CN=ZingArena"

# Package into PKCS12 keystore with storepass 'android' and keypass 'android' and alias 'androiddebugkey'
openssl pkcs12 -export -in final_release.crt -inkey final_release.key -out release.keystore \
  -name androiddebugkey -password pass:android

echo "========================================================"
echo "           🔑 50-YEAR FINAL BULLETPROOF KEY             "
echo "========================================================"
echo "Alias: androiddebugkey"
echo "Password: android"
echo "Validity: 50 Years (18,250 Days)"
echo "--------------------------------------------------------"
echo "SHA-1 Fingerprint (For Firebase):"
openssl x509 -in final_release.crt -noout -fingerprint -sha1 | sed 's/SHA1 Fingerprint=/SHA1: /'

echo "SHA-256 Fingerprint (For Firebase):"
openssl x509 -in final_release.crt -noout -fingerprint -sha256 | sed 's/SHA256 Fingerprint=/SHA256: /'
echo "========================================================"

base64 -w 0 release.keystore > final_release_keystore_base64.txt
echo "SUCCESS!"
