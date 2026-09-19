npx cap add android 2>&1 || true
if [ -d android ]; then
  echo "=== android/app/build.gradle ==="
  cat android/app/build.gradle
  echo "=== android/build.gradle ==="
  cat android/build.gradle
fi
