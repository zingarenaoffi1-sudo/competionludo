#!/bin/bash
set -e

# Generate RSA private key (2048 bit)
openssl genrsa -out release.key 2048

# Generate 50-year (18250 days) Self-Signed Certificate
openssl req -new -x509 -key release.key -out release.crt -days 18250 \
  -subj "/C=IN/ST=Delhi/L=NewDelhi/O=ZingArena/OU=MobileGames/CN=ZingArena"

# Package into PKCS12 keystore (standard Android Keystore format)
openssl pkcs12 -export -in release.crt -inkey release.key -out release.keystore \
  -name zingarena_release -password pass:zingarena123

# Calculate SHA1 and SHA256 fingerprints in Android hex colon format
echo "========================================================"
echo "           🔑 50-YEAR PERMANENT KEY DETAILS             "
echo "========================================================"
echo "Alias: zingarena_release"
echo "Password: zingarena123"
echo "Validity: 50 Years (18,250 Days)"
echo "--------------------------------------------------------"
echo "SHA-1 Fingerprint (For Firebase):"
openssl x509 -in release.crt -noout -fingerprint -sha1 | sed 's/SHA1 Fingerprint=/SHA1: /'

echo "SHA-256 Fingerprint (For Google/Firebase):"
openssl x509 -in release.crt -noout -fingerprint -sha256 | sed 's/SHA256 Fingerprint=/SHA256: /'
echo "========================================================"

# Encode release.keystore to base64
base64 -w 0 release.keystore > release_keystore_base64.txt
echo "SUCCESS: release_keystore_base64.txt generated successfully!"
