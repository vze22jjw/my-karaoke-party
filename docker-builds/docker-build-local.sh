#!/bin/bash

# Simple script for local development to build the main app image and restart services.
# Calls dev-docker-compose.sh to manage containers.

set -e

echo "🚀 Starting Local Docker Build and Deployment..."

# --- Capture Build Metadata ---
# These variables are only for labeling the local image
GIT_SHA=$(git rev-parse HEAD 2>/dev/null)
GIT_SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION="${GIT_SHORT_SHA:-local}-$(date "+%H%S")"

LOCAL_IMAGE_NAME="my-karaoke-party"
TAG0="app-latest"

echo "Build version: $VERSION"

# --- Standard Docker Build ---
# We build only the 'runner' target for the local environment on the host's native architecture.
docker build \
    --build-arg ECR_BUILD=false \
    --build-arg VERSION=${VERSION} \
    --build-arg BUILD_DATE="${BUILD_DATE}" \
    --build-arg GIT_COMMIT_SHA="${GIT_SHA}" \
    --target runner \
    --tag ${LOCAL_IMAGE_NAME}:${TAG0} \
    .

echo "✅ Successfully built local image: ${LOCAL_IMAGE_NAME}:${TAG0}"

# --- Deploy using the local compose script ---
echo "⚙️ Running dev docker-compose to update containers..."
# Call the existing deployment script
bash docker-builds/dev-docker-compose.sh

echo "🎉 Local deployment complete. Check logs above."

# Clean up build cache
docker builder prune --filter until=1h --force || true
