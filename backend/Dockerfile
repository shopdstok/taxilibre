FROM node:18-alpine

WORKDIR /app

# Install runtime tools (used by healthchecks)
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Create uploads directory
RUN mkdir -p uploads/drivers uploads/avatars

# Copy source code
COPY . .

EXPOSE 3003

CMD ["npm", "start"]
