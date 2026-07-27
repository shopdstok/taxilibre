#!/usr/bin/env bash
# Script to start Redis for taxilibre-backend
# Options:
#   docker   : Start Redis via docker-compose (recommended)
#   local    : Start Redis locally (requires redis-server installed)
#   help     : Show this help

set -euo pipefail

usage() {
  echo "Usage: $0 {docker|local|help}"
  echo
  echo "Options:"
  echo "  docker   Start Redis using docker-compose (recommended for consistency)"
  echo "  local    Start Redis locally (requires redis-server in PATH, e.g., via Homebrew)"
  echo "  help     Show this help message"
  exit 1
}

command=${1:-help}

case "$command" in
  docker)
    echo "🚀 Starting Redis via Docker Compose..."
    docker-compose up -d redis
    echo "✅ Redis is running on port 6379"
    echo "💡 To stop: docker-compose stop redis"
    ;;
  local)
    echo "🔧 Starting Redis locally..."
    if command -v redis-server >/dev/null 2>&1; then
      # Use default config or specify a config file if exists
      if [ -f "./docker/redis/redis.conf" ]; then
        echo "📄 Using custom config at ./docker/redis/redis.conf"
        redis-server ./docker/redis/redis.conf &
      else
        echo "📦 Using default configuration"
        redis-server &
      fi
      REDIS_PID=$!
      echo "✅ Redis started with PID $REDIS_PID"
      echo "💡 To stop: kill $REDIS_PID"
    else
      echo "❌ redis-server not found in PATH."
      echo "   Install Redis:"
      echo "     macOS: brew install redis"
      echo "     Ubuntu: sudo apt-get install redis-server"
      echo "     Or use Docker: $0 docker"
      exit 1
    fi
    ;;
  help|*)
    usage
    ;;
esac
