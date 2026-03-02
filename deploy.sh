#!/bin/bash
set -e

DOMAIN="gc.directconnect.services"
EMAIL="admin@directconnect.services"

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

# 4. Check if Let's Encrypt certs already exist in Docker volume
CERTS_EXIST=false
if docker volume inspect gc-app_certbot-certs &>/dev/null; then
  if docker run --rm -v gc-app_certbot-certs:/etc/letsencrypt alpine \
    test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem 2>/dev/null; then
    CERTS_EXIST=true
    echo -e "${GREEN}SSL certificates already exist for ${DOMAIN}${NC}"
  fi
fi
echo ""

# 5. Stop existing containers
echo "Stopping any existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
echo ""

# 6. Build and start all services
echo "Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build
echo ""

# 7. SSL Certificate handling
if [ "$CERTS_EXIST" = false ]; then
  # --- First time: obtain certificate ---
  echo -e "${YELLOW}No SSL certificate found. Obtaining from Let's Encrypt...${NC}"
  sleep 5

  docker compose -f docker-compose.prod.yml run --rm --entrypoint "certbot" certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN} && CERTS_EXIST=true || echo -e "${RED}Failed to obtain SSL certificate.${NC}"

  if [ "$CERTS_EXIST" = true ]; then
    echo -e "${GREEN}SSL certificate obtained!${NC}"
    echo "Restarting web portal with HTTPS..."
    docker compose -f docker-compose.prod.yml restart web-portal
    sleep 3
  fi
  echo ""
else
  # --- Certificate exists: renew only if expiring within 30 days ---
  echo "Checking if SSL certificate needs renewal..."
  RENEW_OUTPUT=$(docker compose -f docker-compose.prod.yml run --rm --entrypoint "certbot" certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --dry-run 2>&1) || true

  if echo "$RENEW_OUTPUT" | grep -q "would be renewed"; then
    echo -e "${YELLOW}Certificate is expiring soon. Renewing...${NC}"
    docker compose -f docker-compose.prod.yml run --rm --entrypoint "certbot" certbot renew \
      --webroot \
      --webroot-path=/var/www/certbot
    echo "Restarting web portal with new certificate..."
    docker compose -f docker-compose.prod.yml restart web-portal
    sleep 3
    echo -e "${GREEN}Certificate renewed!${NC}"
  else
    echo -e "${GREEN}Certificate is still valid. No renewal needed.${NC}"
  fi
  echo ""
fi

# 8. Wait for database to be healthy
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

# 9. Wait for backends to stabilize
echo "Waiting for backend services to stabilize..."
sleep 5

# 10. Run migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T mobile-backend node migrations/run.js
echo -e "${GREEN}Migrations complete!${NC}"
echo ""

# 11. Seed data
echo "Seeding garbage types, users, collection points..."
docker compose -f docker-compose.prod.yml exec -T mobile-backend node seeds/run.js
echo -e "${GREEN}Seeding complete!${NC}"
echo ""

# 12. Health checks
echo "Running health checks..."
sleep 3

MOBILE_HEALTH=$(curl -sf http://localhost:3000/health 2>/dev/null || echo "FAILED")
WEB_HEALTH=$(curl -sf http://localhost:3001/health 2>/dev/null || echo "FAILED")
PORTAL_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
PORTAL_HTTPS=$(curl -sf -k -o /dev/null -w "%{http_code}" https://localhost:443 2>/dev/null || echo "000")

echo "  Mobile Backend:   $MOBILE_HEALTH"
echo "  Web Backend:      $WEB_HEALTH"
echo "  Web Portal HTTP:  $PORTAL_HTTP"
echo "  Web Portal HTTPS: $PORTAL_HTTPS"
echo ""

# Show container status
echo "Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""

# 13. Set up cron job for auto-renewal (runs daily at 3am)
CRON_CMD="0 3 * * * cd $(pwd) && docker compose -f docker-compose.prod.yml run --rm --entrypoint 'certbot' certbot renew --webroot --webroot-path=/var/www/certbot --quiet && docker compose -f docker-compose.prod.yml restart web-portal > /dev/null 2>&1"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  echo "Setting up daily SSL auto-renewal cron job..."
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo -e "${GREEN}Auto-renewal cron job installed (daily at 3:00 AM)${NC}"
else
  echo -e "${GREEN}Auto-renewal cron job already exists${NC}"
fi
echo ""

SERVER_IP=$(hostname -I | awk '{print $1}')

echo "============================================"
echo -e "${GREEN} DEPLOYMENT COMPLETE!${NC}"
echo "============================================"
echo ""
echo " Services:"
echo "   Web Portal:        https://${DOMAIN}"
echo "   Web Portal (IP):   http://${SERVER_IP}"
echo "   Mobile API:        https://${DOMAIN}/v1"
echo "   Mobile API Health: http://${SERVER_IP}:3000/health"
echo "   Web API Health:    http://${SERVER_IP}:3001/health"
echo ""
echo " SSL Certificate:"
if [ "$CERTS_EXIST" = true ]; then
  echo -e "   ${GREEN}Let's Encrypt — active for ${DOMAIN}${NC}"
  echo "   Auto-renewal: daily cron at 3:00 AM (renews only if expiring)"
else
  echo -e "   ${RED}Not configured — running HTTP only${NC}"
fi
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
echo "   View logs:       docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:            docker compose -f docker-compose.prod.yml down"
echo "   Restart:         docker compose -f docker-compose.prod.yml restart"
echo "   DB shell:        docker compose -f docker-compose.prod.yml exec db psql -U gcadmin -d greencollect"
echo "   Rebuild:         docker compose -f docker-compose.prod.yml up -d --build --force-recreate"
echo "   Renew SSL now:   docker compose -f docker-compose.prod.yml run --rm --entrypoint 'certbot' certbot renew --webroot --webroot-path=/var/www/certbot"
echo "   SSL cert info:   docker compose -f docker-compose.prod.yml run --rm --entrypoint 'certbot' certbot certificates"
echo ""
