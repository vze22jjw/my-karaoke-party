#!/bin/bash

set -e

# Function to check if container exists and is running
check_container() {
    local container_name=$1
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "Container ${container_name} does not exist"
        return 1
    fi
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "Container ${container_name} exists but is not running"
        return 1
    fi
    return 0
}

# Check for required containers using env variables
required_containers="mykaraoke-postgres"

need_full_compose=false
for container in "${required_containers[@]}"; do
    if ! check_container "$container"; then
        need_full_compose=true
        break
    fi
done

if [ "$need_full_compose" = true ]; then
    echo "Some required containers are missing or not running. Performing full compose up..."
    docker compose up -d
else
    echo "All required containers are running. Rebuilding only mk-app..."
    # Stop and remove only the app container
    docker compose stop mk-app || true
    docker compose rm -f mk-app || true

    # Rebuild and start the app container, keeping other services running
    docker compose up -d --no-deps mk-app
fi

# Show logs from the app container
echo "Showing logs for mk-app container..."
timeout 10s docker logs mykaraoke-app

# Clean up environment variables
unset $(cat .env | grep -v '^#' | sed -E 's/(.*)=.*/\1/' | xargs)
