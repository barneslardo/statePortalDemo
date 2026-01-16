# Multi-stage build for production

# Stage 1: Build the application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_OKTA_CLIENT_ID
ARG VITE_OKTA_ISSUER
ARG VITE_SOCURE_SDK_KEY
ARG VITE_API_URL
ARG VITE_OKTA_TESTING_DISABLEHTTPSCHECK=false

# Set environment variables for build
ENV VITE_OKTA_CLIENT_ID=$VITE_OKTA_CLIENT_ID
ENV VITE_OKTA_ISSUER=$VITE_OKTA_ISSUER
ENV VITE_SOCURE_SDK_KEY=$VITE_SOCURE_SDK_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_OKTA_TESTING_DISABLEHTTPSCHECK=$VITE_OKTA_TESTING_DISABLEHTTPSCHECK

# Build the application
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files and servers from build stage
COPY --from=build /app/dist ./dist
COPY web-server.js ./
COPY api-server.js ./
COPY start-servers.js ./

# Set environment to production
ENV NODE_ENV=production

# Expose ports
EXPOSE 3050 3051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3050', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start both servers
CMD ["node", "start-servers.js"]
