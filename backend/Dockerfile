FROM node:20-alpine

WORKDIR /app

# Install runtime tools (used by healthchecks) and netcat for Redis wait
RUN apk add --no-cache curl netcat-openbsd

# Install dependencies
COPY package*.json ./
RUN npm ci

# Create uploads directory
RUN mkdir -p uploads/drivers uploads/avatars

# Copy source code
COPY . .

EXPOSE 3003

# Use the start script that waits for Redis
CMD ["./start.sh"]
