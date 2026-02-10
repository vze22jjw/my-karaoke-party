#!/bin/bash

# Usage: bash tests/run-test.sh --env <file> --test <filename> [--url <url>] [--token <token>]

show_help() {
    echo "Usage: $0 --env <file> --test <filename> [--url <url>] [--token <token>]"
    echo ""
    echo "Arguments:"
    echo "  --env    Path to the .env file to source (required)"
    echo "  --test   Name of the test file in tests/ directory (e.g., core-flow.spec.ts)"
    echo "  --url    Override BASE_URL from env file (optional)"
    echo "  --token  Override ADMIN_TOKEN from env file (optional)"
}

ENV_FILE=""
TEST_FILE=""
URL_OVERRIDE=""
TOKEN_OVERRIDE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env) ENV_FILE="$2"; shift 2 ;;
        --test) TEST_FILE="$2"; shift 2 ;;
        --url) URL_OVERRIDE="$2"; shift 2 ;;
        --token) TOKEN_OVERRIDE="$2"; shift 2 ;;
        *) show_help; exit 1 ;;
    esac
done

if [ -z "$ENV_FILE" ] || [ -z "$TEST_FILE" ]; then
    echo "❌ Error: --env and --test are required."
    show_help
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file $ENV_FILE not found."
    exit 1
fi

# Source variables from the provided env file
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Apply overrides if provided
if [ ! -z "$URL_OVERRIDE" ]; then export BASE_URL="$URL_OVERRIDE"; fi
if [ ! -z "$TOKEN_OVERRIDE" ]; then export ADMIN_TOKEN="$TOKEN_OVERRIDE"; fi

# Construct the Playwright command for the specific test
export TEST_COMMAND="npx playwright test tests/$TEST_FILE"

echo "🚀 Running test: $TEST_FILE"
echo "🌐 URL: $BASE_URL"

# Run Docker Compose
docker compose -f tests/docker-compose.test.yml up --build --abort-on-container-exit

# Clean up exported variables
unset BASE_URL
unset ADMIN_TOKEN
unset TEST_COMMAND