#!/usr/bin/env bash
# Creates an AWS Lambda layer containing the yt-dlp binary.
# Usage: ./scripts/create-ytdlp-layer.sh
# Outputs the layer ARN — paste it into infra/cdk.json as "ytdlpLayerArn".
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
LAYER_NAME="yt-dlp-linux-x86"
TMP=$(mktemp -d)

echo "Downloading latest yt-dlp binary..."
curl -sL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" \
  -o "${TMP}/yt-dlp"
chmod +x "${TMP}/yt-dlp"

echo "Packaging layer..."
mkdir -p "${TMP}/layer/bin"
cp "${TMP}/yt-dlp" "${TMP}/layer/bin/yt-dlp"
(cd "${TMP}/layer" && zip -qr ../layer.zip .)

echo "Publishing Lambda layer..."
LAYER_ARN=$(aws lambda publish-layer-version \
  --layer-name "${LAYER_NAME}" \
  --description "yt-dlp binary for Frontera video acquisition" \
  --zip-file "fileb://${TMP}/layer.zip" \
  --compatible-runtimes nodejs20.x \
  --region "${REGION}" \
  --query LayerVersionArn \
  --output text)

rm -rf "${TMP}"

echo ""
echo "✓ Layer published: ${LAYER_ARN}"
echo ""
echo "Add this to infra/cdk.json under frontera.ytdlpLayerArn:"
echo "  \"ytdlpLayerArn\": \"${LAYER_ARN}\""
