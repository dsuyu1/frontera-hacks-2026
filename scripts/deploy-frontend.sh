#!/usr/bin/env bash
# Deploy frontend static build to S3 + CloudFront
# Usage: ./scripts/deploy-frontend.sh

set -euo pipefail

BUCKET="frontera-frontend-602569699510"
CF_ID="E11Q62GECIP1ZX"

echo "Building..."
cd "$(dirname "$0")/../frontend"
npm run build

echo "Uploading to S3..."
aws s3 sync out/ "s3://${BUCKET}/" --delete --region us-east-1

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*" \
  --query 'Invalidation.Id' --output text

echo ""
echo "Done. Live at https://dwzv8106oti1y.cloudfront.net"
