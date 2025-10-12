# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /app

# Copy package descriptors from the backend project
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source code
COPY src ./src

ENV NODE_ENV=production

# Expose the port provided via $PORT by platforms like Render
EXPOSE 10000

CMD ["node", "src/index.js"]
