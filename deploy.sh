#!/bin/bash

set -e

echo "===== Okta + Socure Demo Deployment ====="
echo ""

# Configuration
SERVER_USER="skylar"
SERVER_HOST="192.168.1.111"
APP_NAME="okta-socure-demo"
CONTAINER_NAME="okta-socure-demo"
PORT="3050"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local not found!${NC}"
    echo "Please copy .env.example to .env.local and configure your Okta/Socure credentials."
    exit 1
fi

# Step 1: Build Docker image
echo -e "${BLUE}[1/6]${NC} Building Docker image..."
docker build \
  --build-arg VITE_OKTA_CLIENT_ID="$(grep VITE_OKTA_CLIENT_ID .env.local | cut -d '=' -f2)" \
  --build-arg VITE_OKTA_ISSUER="$(grep VITE_OKTA_ISSUER .env.local | cut -d '=' -f2)" \
  --build-arg VITE_SOCURE_SDK_KEY="$(grep VITE_SOCURE_SDK_KEY .env.local | cut -d '=' -f2)" \
  -t ${APP_NAME}:latest .

# Step 2: Save image
echo -e "${BLUE}[2/6]${NC} Saving Docker image..."
docker save ${APP_NAME}:latest | gzip > ${APP_NAME}.tar.gz

# Step 3: Upload to server
echo -e "${BLUE}[3/6]${NC} Uploading to Blue server..."
scp ${APP_NAME}.tar.gz ${SERVER_USER}@${SERVER_HOST}:/tmp/

# Step 4: Deploy on server
echo -e "${BLUE}[4/6]${NC} Deploying on server..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd /tmp

    # Load image
    echo "Loading Docker image..."
    docker load < okta-socure-demo.tar.gz

    # Stop and remove existing container
    echo "Stopping existing container..."
    docker stop okta-socure-demo 2>/dev/null || true
    docker rm okta-socure-demo 2>/dev/null || true

    # Start new container
    echo "Starting new container..."
    docker run -d \
      --name okta-socure-demo \
      --restart unless-stopped \
      -p 3050:3050 \
      -e NODE_ENV=production \
      okta-socure-demo:latest

    # Cleanup
    rm okta-socure-demo.tar.gz

    echo "Container started successfully"
ENDSSH

# Step 5: Verify deployment
echo -e "${BLUE}[5/6]${NC} Verifying deployment..."
sleep 5
ssh ${SERVER_USER}@${SERVER_HOST} "docker ps | grep ${CONTAINER_NAME}"

# Step 6: Test endpoint
echo -e "${BLUE}[6/6]${NC} Testing endpoint..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${SERVER_HOST}:${PORT})

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo -e "${YELLOW}⚠ Server returned HTTP ${HTTP_CODE}${NC}"
fi

# Cleanup local
rm ${APP_NAME}.tar.gz

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Access the application at: http://${SERVER_HOST}:${PORT}"
echo ""
echo "Useful commands:"
echo "  View logs: ssh ${SERVER_USER}@${SERVER_HOST} 'docker logs -f ${CONTAINER_NAME}'"
echo "  Restart:   ssh ${SERVER_USER}@${SERVER_HOST} 'docker restart ${CONTAINER_NAME}'"
echo "  Stop:      ssh ${SERVER_USER}@${SERVER_HOST} 'docker stop ${CONTAINER_NAME}'"
