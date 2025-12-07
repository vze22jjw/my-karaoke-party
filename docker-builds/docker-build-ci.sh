#!/bin/bash

# Script for CI/CD environment to build and push a single-arch image to ECR.
# Requires AWS_PROFILE (optional), ECR_REGISTRY, ECR_REPOSITORY, and GITHUB_RUN_NUMBER environment variables.
# Requires the Docker Buildx context to be available.

set -e

unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
unset NO_PROXY
unset no_proxy

# Help message
show_help() {
    echo "Usage: $0 --build-type <type> --platform <arch> [--deploy]"
    echo ""
    echo "Arguments:"
    echo "  --build-type   Specify build type (release) [required]"
    echo "  --platform     Specify target platform (e.g., linux/amd64, linux/arm64) [required]"
    echo "  --deploy       Perform AWS login and push to ECR [required for push]"
    echo ""
    echo "Example: $0 --build-type release --deploy --platform linux/amd64"
    exit 1
}

# Parse named arguments
BUILD_TYPE=""
DEPLOY="false"
PLATFORMS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-type)
            BUILD_TYPE="$2"
            shift 2
            ;;
        --deploy)
            DEPLOY="deploy"
            shift
            ;;
        --platform)
            PLATFORMS="$2"
            shift 2
            ;;
        *)
            show_help
            ;;
    esac
done

# Validate required arguments
if [ -z "$BUILD_TYPE" ] || [ "$BUILD_TYPE" != "release" ] || [ "$DEPLOY" != "deploy" ]; then
    echo "Error: This script is intended for release deployment and requires --build-type release and --deploy."
    show_help
fi

if [ -z "$PLATFORMS" ]; then
    echo "Error: --platform is required."
    show_help
fi

# Capture Build Metadata
GIT_SHA=$(git rev-parse HEAD)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -z "$VERSION" ]; then
  if [ -f "package.json" ]; then
    VERSION=$(grep -m1 '"version":' package.json | cut -d'"' -f4)
  else
    VERSION="1.0b"
  fi
fi

export VERSION
export ECR_BUILD="true"
export BUILD_NODE_ENV="production"
echo "Deployment build version: $VERSION"

# Load necessary ECR variables from env-build file (set by GitHub Action)
ENV_BUILD_FILE="./docker-builds/.env-build"
if [ -f "$ENV_BUILD_FILE" ]; then
    echo "Loading ECR configuration from $ENV_BUILD_FILE..."
    set -o allexport
    source "$ENV_BUILD_FILE"
    set +o allexport
else
    echo "Error: $ENV_BUILD_FILE is missing. Cannot proceed with deployment."
    exit 1
fi

# --- ECR TAGGING ---
# The tag must be unique per architecture: app-0.3b-build<RUN_NUMBER>_linux-amd64
# Replace slashes in platform (linux/amd64 -> linux-amd64)
ARCH_TAG=${PLATFORMS//\//-}
IMMUTABLE_TAG="app-${VERSION}-build${GITHUB_RUN_NUMBER}_${ARCH_TAG}" 

# --- PRE-BUILD SETUP ---

# Login to AWS ECR
echo "Logging into AWS ECR Public..."

# FIX: Removed '--profile ${AWS_PROFILE}' to allow using env vars set by GitHub Actions
aws ecr-public get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin ${ECR_REGISTRY}

# --- BUILD AND PUSH ---
echo "Building and pushing single-arch image: ${IMMUTABLE_TAG} for ${PLATFORMS}"

docker buildx build \
    --build-arg ECR_BUILD=${ECR_BUILD} \
    --build-arg VERSION=${VERSION} \
    --build-arg BUILD_DATE="${BUILD_DATE}" \
    --build-arg GIT_COMMIT_SHA="${GIT_SHA}" \
    --target runner \
    --platform ${PLATFORMS} \
    --tag ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMMUTABLE_TAG} \
    --push .

echo "✅ Successfully pushed single-arch image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMMUTABLE_TAG}"

# Clean up build cache (optional, but good practice)
docker builder prune --filter until=1h --force || true
