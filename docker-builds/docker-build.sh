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
fi

echo "Build type: $BUILD_TYPE"
echo "Build version: $VERSION"

# --- ENV management: load values from docker-builds/.env-build for deploy builds
#     For dev builds, .env-build is optional and .env is used directly if it exists
ENV_BUILD_FILE="./docker-builds/.env-build"
PROJECT_ENV="./.env"
CREATED_ENV_COPY=false
BAKED_ENV=false

# Only require .env-build for deploy builds
if [ "$DEPLOY" == "deploy" ]; then
    if [ ! -f "$ENV_BUILD_FILE" ]; then
        echo "Error: $ENV_BUILD_FILE is required for deploy builds"
        exit 1
    fi
    
    # Export variables from ENV_BUILD_FILE into current shell for script use
    set -o allexport
    # shellcheck disable=SC1090
    source "$ENV_BUILD_FILE"
    set +o allexport
else
    # For dev builds, only load .env-build if it exists
    if [ -f "$ENV_BUILD_FILE" ]; then
        echo "Loading environment from $ENV_BUILD_FILE..."
        set -o allexport
        # shellcheck disable=SC1090
        source "$ENV_BUILD_FILE"
        set +o allexport
    else
        echo "Note: $ENV_BUILD_FILE not found, using existing .env if available"
    fi
fi

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
AWS_PROFILE="vze22jjw"
AWS_REGION="us-east-1"
ECR_REGISTRY="public.ecr.aws"
ECR_REPOSITORY="vze22jjw/my-karaoke-party"
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
    --build-arg VERSION=${VERSION} \
    --target runner"

if [ "$DEPLOY" == "deploy" ]; then
    echo "Preparing for deployment to ECR..."

    # Ensure .env is NOT in project root when building for deploy
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

    # For local builds, use existing .env if available
    if [ -f "$PROJECT_ENV" ]; then
        echo "Using existing $PROJECT_ENV for local build"
    else
        echo "Warning: No $PROJECT_ENV found, build will use Dockerfile defaults"
    fi

    # Build and load locally
    $BUILD_CMD \
        --platform linux/arm64 \
        --tag ${LOCAL_IMAGE_NAME}:${TAG0} \
        --tag ${LOCAL_IMAGE_NAME}:${TAG1} \
        --load .

    echo "Successfully built local images:"
    echo "- ${LOCAL_IMAGE_NAME}:${TAG0}"
    echo "- ${LOCAL_IMAGE_NAME}:${TAG1}"
fi

if [[ -n "${GITHUB_ACTIONS}" ]]; then
    echo "Running in GitHub runner environment. No Cleanup required."
    exit 0
else # Clean up builder only if we created it in this run
    echo "Cleaning up build cache..."
    if [ "$BUILDER_CREATED" = true ]; then
        docker buildx rm "${BUILDER_NAME}"
    fi
    docker builder prune --filter until=24h --force
    echo "Build cache cleaned up successfully"
fi
