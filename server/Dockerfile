# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /app

# Copy package files từ thư mục server/
COPY server/package*.json ./

# Cài dependencies production
RUN npm ci --omit=dev

# Copy toàn bộ source backend
COPY server/src ./src

ENV NODE_ENV=production

# Fly.io sử dụng cổng 8080 cho HTTP service
EXPOSE 8080

CMD ["node", "src/index.js"]
