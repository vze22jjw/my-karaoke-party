#!/bin/bash

set -e

# Help message
show_help() {
    echo "Usage: $0 --build-type <type> [--deploy]"
    echo ""
    echo "Arguments:"
    echo "  --build-type   Specify build type (dev or release) [required]"
    echo "  --deploy       Deploy to ECR (optional)"
    echo ""
    echo "Examples:"
    echo "  $0 --build-type dev"
    echo "  $0 --build-type release --deploy"
    exit 1
}

# Parse named arguments
BUILD_TYPE=""
DEPLOY="false"

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
        *)
            show_help
            ;;
    esac
done

# Validate required arguments
if [ -z "$BUILD_TYPE" ] || [[ ! "$BUILD_TYPE" =~ ^(dev|release)$ ]]; then
    echo "Error: --build-type is required and must be 'dev' or 'release'"
    show_help
fi

# Version configuration
if [ "$BUILD_TYPE" == "release" ]; then
    VERSION="0.0.1-BETA"
else
    VERSION="$(git rev-parse --short HEAD)-$(date "+%y%m%d%S")"
    echo "Development build version: $VERSION"
fi

# Import environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    # Export all variables from .env file, ignoring comments and empty lines
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in parent directory"
    exit 1
fi

# AWS Configuration
AWS_PROFILE="$AWS_PROFILE"
AWS_REGION="$AWS_REGION"
ECR_REGISTRY="$ECR_REGISTRY"
ECR_REPOSITORY="$ECR_REPOSITORY"
TAG0="app-latest"
TAG1="app-${VERSION}"
PLATFORMS="linux/arm64,linux/amd64"

# Set up buildx builder
if ! docker buildx ls | grep -q "multi-arch-builder"; then
    echo "Creating new buildx builder..."
    docker buildx create --name multi-arch-builder
fi

echo "Using multi-arch builder..."
docker buildx use multi-arch-builder

# Build command base
BUILD_CMD="docker buildx build \
    --build-arg VERSION=${VERSION} \
    --target runner"

if [ "$DEPLOY" == "deploy" ]; then
    echo "Building for deployment to ECR..."
    # Login to AWS ECR
    aws ecr-public get-login-password --region $AWS_REGION --profile ${AWS_PROFILE} | \
        docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    # Build and push to ECR
    $BUILD_CMD \
        --platform ${PLATFORMS} \
        --tag ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG0} \
        --tag ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG1} \
        --push .
    
    echo "Successfully pushed images to ECR:"
    echo "- ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG0}"
    echo "- ${ECR_REGISTRY}/${ECR_REPOSITORY}:${TAG1}"
else
    echo "Building for local development..."
    # Build and load locally
    $BUILD_CMD \
        --platform linux/arm64 \
        --tag my-karaoke-party:${TAG0} \
        --load .
    
    echo "Successfully built local images:"
    echo "- my-karaoke-party:${TAG0}"
fi

# Clean up
docker buildx rm multi-arch-builder
docker builder prune --filter until=24h --force
echo "Build cache cleaned up successfully"
