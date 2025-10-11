# syntax=docker/dockerfile:1

# Multi-stage build để tạo image nhỏ gọn
FROM node:20-alpine AS base

WORKDIR /app

# Cài đặt dependencies trước để tận dụng layer cache
COPY package*.json ./
RUN npm ci --omit=dev

# Sao chép source code
COPY src ./src

ENV NODE_ENV=production

# Fly.io mặc định forward traffic tới cổng 8080
EXPOSE 8080

CMD ["node", "src/index.js"]
