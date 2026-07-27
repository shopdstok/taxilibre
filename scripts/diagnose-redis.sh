#!/bin/bash
# =============================================================================
# Redis Diagnostic Script for TaxiLibre Backend
# Checks: Redis Installation, Service status, Port connectivity, Env variables
# =============================================================================

set -e  # Exit on error
set -u  # Treat unset variables as error

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}=== Redis Diagnosis for TaxiLibre Backend ===${COLOR_NC}"
echo ""

# 1. Check if Redis CLI is installed
echo -e "${COLOR_YELLOW}1️⃣  Checking Redis CLI installation...${COLOR_NC}"
if command -v redis-cli &> /dev/null; then
  REDIS_CLI_VERSION=$(redis-cli --version | head -n1 | cut -d' ' -f2)
  echo -e "${COLOR_GREEN}✅ redis-cli found (version: $REDIS_CLI_VERSION)${COLOR_NC}"
else
  echo -e "${COLOR_RED}❌ redis-cli NOT FOUND. Please install Redis.${COLOR_NC}"
  echo "   - Ubuntu/Debian: sudo apt-get install redis-tools"
  echo "   - macOS (brew):   brew install redis"
  echo "   - Or use Docker (see below)"
fi
echo ""

# 2. Check if Redis server is running (via systemctl or docker)
echo -e "${COLOR_YELLOW}2️⃣  Checking Redis server status...${COLOR_NC}"
REDIS_RUNNING=false
if systemctl is-active --quiet redis-service 2>/dev/null || systemctl is-active --quiet redis 2>/dev/null; then
  REDIS_RUNNING=true
  echo -e "${COLOR_GREEN}✅ Redis service is active (systemd)${COLOR_NC}"
elif docker ps --filter "name=redis" --format "{{.Names}}" | grep -q redis; then
  REDIS_RUNNING=true
  echo -e "${COLOR_GREEN}✅ Redis container is running (Docker)${NC}"
else
  echo -e "${COLOR_RED}❌ Redis server does not appear to be running.${COLOR_NC}"
  echo "   Start options:"
  echo "   - Docker (recommended): docker run -d --name redis -p 6379:6379 redis:7-alpine"
  echo "   - Local: sudo systemctl start redis  (or brew services start redis)"
fi
echo ""

# 3. Check port 6379 accessibility
echo -e "${COLOR_YELLOW}3️⃣  Checking TCP port 6379...${COLOR_NC}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
if timeout 2 bash -c "</dev/tcp/${REDIS_HOST}/${REDIS_PORT}" 2>/dev/null; then
  echo -e "${COLOR_GREEN}✅ Port ${REDIS_PORT} on ${REDIS_HOST} is reachable${COLOR_NC}"
else
  echo -e "${COLOR_RED}❌ Cannot connect to ${REDIS_HOST}:${REDIS_PORT}${COLOR_NC}"
  echo "   Ensure Redis is running and accessible."
fi
echo ""

# 4. Check environment variables (from .env or .env.example)
echo -e "${COLOR_YELLOW}4️⃣  Checking environment variables...${COLOR_NC}"
ENV_FILE=""
if [ -f ".env" ]; then
  ENV_FILE=".env"
elif [ -f ".env.example" ]; then
  ENV_FILE=".env.example"
else
  ENV_FILE="none"
fi

if [ "$ENV_FILE" != "none" ]; then
  echo -e "${COLOR_GREEN}Using environment file: $ENV_FILE${COLOR_NC}"
  # Source the file (export variables) but only for reading
  # Use grep to extract values
  REDIS_HOST_FROM_ENV=$(grep -E '^REDIS_HOST=' "$ENV_FILE" | cut -d'=' -f2- | sed 's/\"//g' | sed \"/'^$/d\")
  REDIS_PORT_FROM_ENV=$(grep -E '^REDIS_PORT=' "$ENV_FILE" | cut -d'=' -f2- | sed 's/\"//g' | sed \"/'^$/d\")
  REDIS_PASSWORD_FROM_ENV=$(grep -E '^REDIS_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2- | sed 's/\"//g' | sed \"/'^$/d\")
  REDIS_URL_FROM_ENV=$(grep -E '^REDIS_URL=' "$ENV_FILE" | cut -d'=' -f2- | sed 's/\"//g' | sed \"/'^$/d\")
else
  echo -e "${COLOR_YELLOW}No .env or .env.example found. Using defaults.${COLOR_NC}"
fi

echo "   REDIS_HOST: ${REDIS_HOST_FROM_ENV:-$REDIS_HOST}"
echo "   REDIS_PORT: ${REDIS_PORT_FROM_ENV:-$REDIS_PORT}"
echo "   REDIS_PASSWORD: ${REDIS_PASSWORD_FROM_ENV:-'(not set)'}"
echo "   REDIS_URL: ${REDIS_URL_FROM_ENV:-'(not set)'}"
echo ""

# 5. Try to ping Redis via CLI if possible
echo -e "${COLOR_YELLOW}5️⃣  Testing Redis PING via CLI...${COLOR_NC}"
if command -v redis-cli &> /dev/null; then
  # Use host/port/env values
  PING_OUTPUT=$(redis-cli -h "$REDIS_HOST_FROM_ENV" -p "$REDIS_PORT_FROM_ENV" -a "$REDIS_PASSWORD_FROM_ENV" ping 2>&1) || true
  if [[ "$PING_OUTPUT" == "PONG" ]]; then
    echo -e "${COLOR_GREEN}✅ Redis PING returned PONG${COLOR_NC}"
  else
    echo -e "${COLOR_RED}❌ Redis PING failed: $PING_OUTPUT${COLOR_NC}"
  fi
else
  echo -e "${COLOR_YELLOW}Skipping PING test (redis-cli not installed).${COLOR_NC}"
fi
echo ""

# 6. Provide summary and next steps
echo -e "${COLOR_BLUE}=== Summary ===${COLOR_NC}"
if command -v redis-cli &> /dev/null && [[ "$PING_OUTPUT" == "PONG" ]]; then
  echo -e "${COLOR_GREEN}Redis appears to be healthy and reachable.${COLOR_NC}"
else
  echo -e "${COLOR_RED}Redis is not reachable. Please follow the steps above to start/configure Redis.${COLOR_NC}"
fi
echo ""
echo -e "${COLOR_YELLOW}Quick start with Docker (if you have Docker installed):${COLOR_NC}"
echo "   docker run -d --name redis-local -p 6379:6379 redis:7-alpine"
echo ""
echo -e "${COLOR_YELLOW}Then update your .env (if using localhost):${COLOR_NC}"
echo "   REDIS_HOST=localhost"
echo "   REDIS_PORT=6379"
echo "   REDIS_PASSWORD="
echo ""
echo -e "${COLOR_GREEN}Diagnostic complete.${COLOR_NC}"
