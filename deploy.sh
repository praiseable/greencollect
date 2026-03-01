#!/bin/bash
set -e

echo "============================================"
echo " GreenCollect — Ubuntu 24.04 Deployment"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker $USER
  echo -e "${GREEN}Docker installed successfully.${NC}"
  echo ""
  echo "NOTE: You may need to log out and log back in for Docker group changes."
  echo "After re-login, run this script again."
  echo ""
  exit 0
fi

echo -e "${GREEN}Docker found: $(docker --version)${NC}"

# 2. Check docker compose
if ! docker compose version &> /dev/null; then
  echo "Docker Compose plugin not found. Installing..."
  sudo apt-get install -y docker-compose-plugin
fi
echo -e "${GREEN}Docker Compose: $(docker compose version)${NC}"
echo ""

# 3. Stop any conflicting host services
echo "Stopping conflicting host services (nginx, apache2, postgres)..."
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop postgresql 2>/dev/null || true
echo ""

# 4. Stop existing containers if running
echo "Stopping any existing containers..."
docker compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
echo ""

# 5. Build and start all services (no-cache for fresh build)
echo "Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build
echo ""

# 6. Wait for database to be healthy
echo "Waiting for database to be ready..."
RETRIES=40
until docker compose -f docker-compose.prod.yml exec -T db pg_isready -U gcadmin -d greencollect 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}Database did not become ready in time. Check logs:${NC}"
    echo "  docker compose -f docker-compose.prod.yml logs db"
    exit 1
  fi
  echo "  Waiting... ($RETRIES attempts left)"
  sleep 3
done
echo -e "${GREEN}Database is ready!${NC}"
echo ""

# 7. Wait a few seconds for backends to finish starting
echo "Waiting for backend services to stabilize..."
sleep 5

# 8. Run migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T mobile-backend node migrations/run.js
echo -e "${GREEN}Migrations complete!${NC}"
echo ""

# 9. Seed data
echo "Seeding garbage types, users, collection points..."
docker compose -f docker-compose.prod.yml exec -T mobile-backend node seeds/run.js
echo -e "${GREEN}Seeding complete!${NC}"
echo ""

# 10. Health checks
echo "Running health checks..."
sleep 3

MOBILE_HEALTH=$(curl -sf http://localhost:3000/health 2>/dev/null || echo "FAILED")
WEB_HEALTH=$(curl -sf http://localhost:3001/health 2>/dev/null || echo "FAILED")
PORTAL_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")

echo "  Mobile Backend:  $MOBILE_HEALTH"
echo "  Web Backend:     $WEB_HEALTH"
echo "  Web Portal:      HTTP $PORTAL_STATUS"
echo ""

# Show container status
echo "Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

# 11. Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "============================================"
echo -e "${GREEN} DEPLOYMENT COMPLETE!${NC}"
echo "============================================"
echo ""
echo " Services:"
echo "   Web Portal:        http://${SERVER_IP}"
echo "   Mobile API:        http://${SERVER_IP}:3000/v1"
echo "   Mobile API Health: http://${SERVER_IP}:3000/health"
echo "   Web API Health:    http://${SERVER_IP}:3001/health"
echo ""
echo " Default Logins (Web Portal):"
echo "   Admin:    admin@greencollect.app / Admin@123456"
echo "   Manager:  manager@greencollect.app / manager123"
echo "   Regional: regional@greencollect.app / regional123"
echo ""
echo " Mobile App Test Users (OTP login):"
echo "   House Owner:        +929999990001"
echo "   Local Collector:    +929999990002"
echo "   Regional Collector: +929999990003"
echo "   Manager:            +929999990004"
echo ""
echo " Useful Commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart"
echo "   DB shell:     docker compose -f docker-compose.prod.yml exec db psql -U gcadmin -d greencollect"
echo "   Rebuild:      docker compose -f docker-compose.prod.yml up -d --build --force-recreate"
echo ""
