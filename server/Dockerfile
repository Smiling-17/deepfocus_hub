# syntax=docker/dockerfile:1

FROM node:20-alpine3.19 AS base

# Cập nhật packages và cài đặt security patches
RUN apk update && apk upgrade && apk add --no-cache dumb-init

WORKDIR /app

# Tạo user non-root để chạy app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy package files từ thư mục server/
COPY package*.json ./

# Cài dependencies production
RUN npm ci --omit=dev && npm cache clean --force

# Copy toàn bộ source backend
COPY --chown=nextjs:nodejs src ./src

# Chuyển sang user non-root
USER nextjs

ENV NODE_ENV=production

# Fly.io sử dụng cổng 8080 cho HTTP service
EXPOSE 8080

# Sử dụng dumb-init để xử lý signals đúng cách
CMD ["dumb-init", "node", "src/index.js"]
