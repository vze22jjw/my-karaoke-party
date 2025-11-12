#!/bin/bash

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
    export VERSION="v0.0.1-$(git rev-parse --short HEAD)"
    export ECR_BUILD="true"
    echo "Release build version: $VERSION"
else
    export VERSION="$(git rev-parse --short HEAD)-$(date "+%y%m%d%S")"
    export ECR_BUILD="false"
    echo "Development build version: $VERSION"
fi

# --- ENV management: load values from docker-builds/.env-build but only place .env
#     into the project for local dev builds. Ensure .env is NOT present in deploy builds.
ENV_BUILD_FILE="./docker-builds/.env-build"
PROJECT_ENV="./.env"
CREATED_ENV_COPY=false
BAKED_ENV=false

if [ ! -f "$ENV_BUILD_FILE" ]; then
    echo "Error: env build file not found: $ENV_BUILD_FILE"
    exit 1
fi

# Export variables from ENV_BUILD_FILE into current shell for script use
set -o allexport
# shellcheck disable=SC1090
source "$ENV_BUILD_FILE"
set +o allexport

# Ensure we clean up/restore .env on exit
cleanup_env() {
    # remove a .env we created for local builds
    if [ "$CREATED_ENV_COPY" = true ] && [ -f "$PROJECT_ENV" ]; then
        rm -f "$PROJECT_ENV"
    fi
    # restore a backed up .env that we moved aside for deploy
    if [ "$BAKED_ENV" = true ] && [ -f "${PROJECT_ENV}.bak" ]; then
        mv -f "${PROJECT_ENV}.bak" "$PROJECT_ENV"
    fi
}
trap cleanup_env EXIT

# AWS Configuration
AWS_PROFILE="$AWS_PROFILE"
AWS_REGION="$AWS_REGION"
ECR_REGISTRY="$ECR_REGISTRY"
ECR_REPOSITORY="$ECR_REPOSITORY"
LOCAL_IMAGE_NAME="my-karaoke-party"
TAG0="app-latest"
TAG1="app-${VERSION}"
PLATFORMS="linux/arm64,linux/amd64"

# Set up buildx builder (only create if missing)
BUILDER_NAME="multi-arch-builder"
BUILDER_CREATED=false
if ! docker buildx ls | grep -q "^${BUILDER_NAME}[[:space:]]"; then
    echo "Creating new buildx builder..."
    docker buildx create --name "${BUILDER_NAME}"
    BUILDER_CREATED=true
fi

echo "Using buildx builder ${BUILDER_NAME}..."
docker buildx use "${BUILDER_NAME}"

# Build command base
BUILD_CMD="docker buildx build \
    --build-arg ECR_BUILD=${ECR_BUILD} \
    --build-arg VERSION=${VERSION} \
    --target runner"

if [ "$DEPLOY" == "deploy" ]; then
    echo "Preparing for deployment to ECR..."

    # Ensure .env is NOT in project root when building for deploy.
    if [ -f "$PROJECT_ENV" ]; then
        echo "Backing up existing $PROJECT_ENV to ${PROJECT_ENV}.bak"
        mv -f "$PROJECT_ENV" "${PROJECT_ENV}.bak"
        BAKED_ENV=true
    fi

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

    # For local builds, create project .env from the build env file so local image/run uses it.
    if [ -f "$PROJECT_ENV" ]; then
        echo "$PROJECT_ENV already exists, leaving it in place for local build."
    else
        echo "Creating project $PROJECT_ENV from $ENV_BUILD_FILE"
        cp "$ENV_BUILD_FILE" "$PROJECT_ENV"
        CREATED_ENV_COPY=true
    fi

    # Build and load locally
    $BUILD_CMD \
        --platform linux/arm64 \
        --tag ${LOCAL_IMAGE_NAME}:${TAG0} \
        --load .
    
    echo "Successfully built local images:"
    echo "- ${LOCAL_IMAGE_NAME}:${TAG0}"
fi

# Clean up builder only if we created it in this run
if [ "$BUILDER_CREATED" = true ]; then
    docker buildx rm "${BUILDER_NAME}"
fi

docker builder prune --filter until=24h --force
echo "Build cache cleaned up successfully"
