# Redis Setup Guide for taxilibre-backend

This guide provides multiple ways to set up and run Redis for the taxilibre-backend application, including Docker (recommended), local installation, and troubleshooting steps.

## 📋 Overview

- **Default Redis Configuration**: Host `localhost`, Port `6379`, No password (development)
- **Environment Variables**: 
  - `REDIS_HOST` (default: `localhost`)
  - `REDIS_PORT` (default: `6379`)
  - `REDIS_PASSWORD` (optional)
  - `REDIS_URL` (overrides host/port/password if set, e.g., `redis://:password@host:port`)

## 🐳 Option 1: Docker Compose (Recommended)

The simplest and most reproducible method is using Docker Compose.

### Start Redis with Docker Compose

```bash
# From the project root
docker-compose up -d redis
```

This will:
- Pull the `redis:7-alpine` image
- Start a container named `taxilibre-redis` on port `6379`
- Use a custom Redis configuration file (`docker/redis/redis.conf`) with persistence enabled
- Mount a Docker volume (`redis_data`) for data persistence

### Stop Redis

```bash
docker-compose stop redis
# Or to remove container and volumes:
docker-compose down -v
```

### Verify Redis is Running

```bash
docker ps | grep redis
# Expected output:
# taxilibre-redis   redis:7-alpine   "docker-entrypoint.s…"   2 minutes ago   Up 2 minutes   0.0.0.0:6379->6379/tcp   taxilibre-redis
```

## 🖥️ Option 2: Local Installation (macOS / Linux)

If you prefer running Redis directly on your host machine:

### macOS (using Homebrew)

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify it's running
brew services list | grep redis
# Expected: redis started

# To stop later:
brew services stop redis
```

### Ubuntu / Debian

```bash
# Install Redis server
sudo apt-get update
sudo apt-get install -y redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable on boot
sudo systemctl enable redis-server

# Verify
sudo systemctl status redis-server
```

### Manual Start (any OS with redis-server in PATH)

```bash
# Use the provided config file (optional)
redis-server ./docker/redis/redis.conf &
# Or without custom config (uses defaults)
redis-server &
```

### Verify Local Redis

```bash
redis-cli ping
# Should return: PONG
```

## 🧪 Option 3: Quick Docker One-liner (No compose)

If you don't want to use docker-compose:

```bash
docker run -d --name taxilibre-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

Stop and remove:

```bash
docker stop taxilibre-redis && docker rm taxilibre-redis
docker volume rm redis_data  # Optional: removes persisted data
```

## 🔧 Configuration Files Provided

### 1. Redis Configuration (`docker/redis/redis.conf`)

A production-ready Redis configuration with:
- Persistence (`appendonly yes` can be enabled; currently disabled for faster dev)
- Memory limit (`256mb`)
- LRU eviction policy
- Tuned for typical workload

### 2. Docker Compose Service

See `docker-compose.yml` under the `redis` service. It mounts the custom config and exposes port 6379.

### 3. Node.js Redis Client (`backend/config/redis.js`)

Features:
- Supports `REDIS_URL` (preferred) or separate `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
- Automatic reconnection with exponential backoff (50ms → max 30s)
- Comprehensive logging via `loggingService`
- Health check helper: `isRedisAvailable()`
- Backward compatible export (`module.exports.redis`)

### 4. Health Check Script (`scripts/health-check.js`)

Tests connectivity by sending a PING command.

```bash
node scripts/health-check.js
# ✅ Redis is healthy (PING -> PONG)   (exit 0)
# or error message and exit 1
```

### 5. Diagnostic Script (`scripts/diagnose-redis.sh`)

Comprehensive checker for:
- Redis CLI availability
- Server status (systemd or Docker)
- Port reachability
- Environment variables
- Actual PING test

```bash
chmod +x scripts/diagnose-redis.sh
./scripts/diagnose-redis.sh
```

### 6. Start Helper (`scripts/start-redis.sh`)

Convenient wrapper to start Redis via Docker or locally.

```bash
# Start with Docker (recommended)
./scripts/start-redis.sh docker

# Start locally (if redis-server installed)
./scripts/start-redis.sh local
```

## 📝 Environment Setup

Copy the example environment file and adjust as needed:

```bash
# From project root
cp backend/.env.example .env   # or backend already has .env

# Edit .env (ensure these lines exist and are correct):
REDIS_HOST=localhost   # or your Redis host
REDIS_PORT=6379
REDIS_PASSWORD=        # set if you require auth
# Or use full URL:
# REDIS_URL=redis://:password@localhost:6379
```

> **NOTE**: The backend already includes a `.env` file. If you're using Docker Compose, the `backend` service will load `.env` from the project root (as defined in `docker-compose.yml`). Ensure the values match your Redis setup.

## ✅ Testing the Connection

After starting Redis and setting environment variables, restart the backend (if already running) and run the health check:

```bash
# Start backend (example)
cd backend
npm run dev   # or your start script

# In another terminal, from project root:
node scripts/health-check.js
```

Expected output:
```
🔍 Checking Redis connection...
✅ Redis is healthy (PING -> PONG)
```

## 🐞 Troubleshooting

### Common Errors

1. **ECONNREFUSED** 
   - Redis is not running or not listening on the configured host/port.
   - **Fix:** Start Redis (`docker-compose up -d redis` or local equivalent) and verify with `redis-cli ping`.

2. **Connection timeout**
   - Network/firewall blocking port 6379, or wrong host.
   - **Fix:** Check `REDIS_HOST`/`REDIS_PORT` in `.env`. Use `telnet <host> 6379` or `nc -zv <host> 6379` to test connectivity.

3. **Authentication required**
   - You set a password in Redis config but not in env (or vice versa).
   - **Fix:** Ensure `REDIS_PASSWORD` matches the Redis requirepass setting, or disable auth for dev.

### Using the Diagnostic Script

Run the diagnostic script to automatically check common issues:

```bash
./scripts/diagnose-redis.sh
```

It will guide you through each step and provide specific commands to fix problems.

### Docker-Specific Issues

- **Port already in use**: Another service is using 6379. Stop it or change the port in `docker-compose.yml` and `.env`.
- **Container crashes immediately**: Check logs: `docker logs taxilibre-redis`
- **Permission denied on volume**: Ensure Docker daemon has proper permissions, or use named volumes as in the provided compose file.

### Local Installation Issues

- **Command not found: redis-server**
  - Install Redis as per your OS instructions above.
- **Service fails to start**
  - Check system logs: `journalctl -u redis-server` (Linux) or `brew services info redis` (macOS)

## 📚 References

- Redis Documentation: https://redis.io/documentation
- Docker Redis Image: https://hub.docker.com/_/redis
- Node.js Redis Client v4: https://github.com/redis/node-redis#readme

## 🎉 You're All Set!

With Docker Compose, you can start the entire stack (including PostgreSQL, etc.) with:

```bash
docker-compose up -d
```

Then verify all services are healthy before launching the backend.

Happy coding! 🚖
