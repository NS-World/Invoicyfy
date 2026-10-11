#!/usr/bin/env bash
# Builds a ready-to-upload zip for Hostinger (or any Apache/LiteSpeed PHP hosting):
#   invoicyfy-hostinger.zip
#     ├─ index.html, assets/, .htaccess   (web app)
#     └─ api/                             (PHP API with vendor/, without .env and tests)
# The app calls the API on the same domain at /api/, so no CORS setup is needed.
#
# Usage: scripts/package-hostinger.sh ../Invoicyfy-Backend
set -euo pipefail

FRONTEND="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$(cd "${1:?Pass the path of the Invoicyfy-Backend folder}" && pwd)"
OUT="$FRONTEND/deploy"
STAGE="$OUT/invoicyfy"

rm -rf "$STAGE" "$OUT/invoicyfy-hostinger.zip"
mkdir -p "$STAGE/api"

echo "Building web app..."
(cd "$FRONTEND" && VITE_API_BASE_URL=/api/ npx vite build --outDir "$STAGE" --emptyOutDir=false)

echo "Copying API..."
(cd "$BACKEND" && git ls-files | grep -v '^tests/' | tar -cf - -T -) | tar -xf - -C "$STAGE/api"
(cd "$STAGE/api" && composer install --no-dev --optimize-autoloader --no-interaction --quiet)
# Libraries' git history, tests and docs are not needed on the server.
find "$STAGE/api/vendor" -depth \( -name .git -o -name tests -o -name .github \) -type d -exec rm -rf {} +

(cd "$OUT" && zip -qr invoicyfy-hostinger.zip invoicyfy)
rm -rf "$STAGE"
echo "Done: $OUT/invoicyfy-hostinger.zip"
