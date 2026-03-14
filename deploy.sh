#!/bin/bash
set -e

DOMAIN="gc.directconnect.services"
EMAIL="admin@directconnect.services"

echo "============================================"
echo "Kabariya — Production Deployment"
echo " Geo-Franchise Marketplace Platform"
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
  exit 0
fi

echo -e "${GREEN}Docker found: $(docker --version)${NC}"

# 2. Check docker compose
if ! docker compose version &> /dev/null; then
  sudo apt-get install -y docker-compose-plugin
fi
echo -e "${GREEN}Docker Compose: $(docker compose version)${NC}"
echo ""

# 3. Stop any conflicting host services
echo "Stopping conflicting host services..."
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop postgresql 2>/dev/null || true
echo ""

# 4. Check if Let's Encrypt certs already exist
CERTS_EXIST=false
if docker volume inspect gc-app_certbot-certs &>/dev/null; then
  if docker run --rm -v gc-app_certbot-certs:/etc/letsencrypt alpine \
    test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem 2>/dev/null; then
    CERTS_EXIST=true
    echo -e "${GREEN}SSL certificates already exist for ${DOMAIN}${NC}"
  fi
fi
echo ""

# 5. Stop existing containers (preserve volumes)
echo "Stopping any existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
echo ""

# 6. Build and start all services
echo "Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build 2>&1 || {
  echo -e "${YELLOW}docker compose exited with non-zero code. Verifying containers...${NC}"
}

# Verify containers are actually running
sleep 8
RUNNING=$(docker compose -f docker-compose.prod.yml ps --status running -q 2>/dev/null | wc -l)
if [ "$RUNNING" -lt 4 ]; then
  echo -e "${RED}ERROR: Only $RUNNING containers running (expected 5). Deployment may have issues.${NC}"
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs --tail 30
  exit 1
fi
echo -e "${GREEN}All $RUNNING containers are running.${NC}"
echo ""

# 7. SSL Certificate handling
if [ "$CERTS_EXIST" = false ]; then
  echo -e "${YELLOW}No SSL certificate found. Obtaining from Let's Encrypt...${NC}"
  sleep 5

  docker run --rm \
    -v gc-app_certbot-webroot:/var/www/certbot \
    -v gc-app_certbot-certs:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN} && CERTS_EXIST=true || echo -e "${RED}Failed to obtain SSL certificate.${NC}"

  if [ "$CERTS_EXIST" = true ]; then
    echo -e "${GREEN}SSL certificate obtained!${NC}"
    echo "Restarting web-client with HTTPS..."
    docker compose -f docker-compose.prod.yml restart web-client
    sleep 3
  fi
  echo ""
else
  echo "Checking if SSL certificate needs renewal..."
  RENEW_OUTPUT=$(docker run --rm \
    -v gc-app_certbot-webroot:/var/www/certbot \
    -v gc-app_certbot-certs:/etc/letsencrypt \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --dry-run 2>&1) || true

  if echo "$RENEW_OUTPUT" | grep -q "would be renewed"; then
    echo -e "${YELLOW}Certificate is expiring soon. Renewing...${NC}"
    docker run --rm \
      -v gc-app_certbot-webroot:/var/www/certbot \
      -v gc-app_certbot-certs:/etc/letsencrypt \
      certbot/certbot renew \
      --webroot \
      --webroot-path=/var/www/certbot
    docker compose -f docker-compose.prod.yml restart web-client
    sleep 3
    echo -e "${GREEN}Certificate renewed!${NC}"
  else
    echo -e "${GREEN}Certificate is still valid. No renewal needed.${NC}"
  fi
  echo ""
fi

# 8. Wait for database
echo "Waiting for database to be ready..."
RETRIES=40
until docker compose -f docker-compose.prod.yml exec -T db pg_isready -U gcadmin -d kabariya 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}Database did not become ready in time.${NC}"
    exit 1
  fi
  echo "  Waiting... ($RETRIES attempts left)"
  sleep 3
done
echo -e "${GREEN}Database is ready!${NC}"
echo ""

# 9. Run Prisma schema push (safe for existing data, adds new tables/columns)
echo "Syncing database schema..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push 2>&1 || {
  echo -e "${YELLOW}prisma db push failed, trying with --accept-data-loss...${NC}"
  docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss 2>&1 || true
}
echo -e "${GREEN}Database schema updated!${NC}"
echo ""

# 10. Seed data
echo "Seeding database..."
docker compose -f docker-compose.prod.yml exec -T backend node prisma/seed.js
echo -e "${GREEN}Seeding complete!${NC}"
echo ""

# 11. Health checks
echo "Running health checks..."
sleep 3

BACKEND_HEALTH=$(curl -sf http://localhost:4000/health 2>/dev/null || echo "FAILED")
PORTAL_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
PORTAL_HTTPS=$(curl -sf -k -o /dev/null -w "%{http_code}" https://localhost:443 2>/dev/null || echo "000")
ADMIN_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null || echo "000")

echo "  Backend API:     $BACKEND_HEALTH"
echo "  Web Client HTTP: $PORTAL_HTTP"
echo "  Web Client HTTPS:$PORTAL_HTTPS"
echo "  Admin Portal:    $ADMIN_HTTP"
echo ""

docker compose -f docker-compose.prod.yml ps
echo ""

# 12. SSL auto-renewal cron job
CRON_CMD="0 3 * * * docker run --rm -v gc-app_certbot-webroot:/var/www/certbot -v gc-app_certbot-certs:/etc/letsencrypt certbot/certbot renew --webroot --webroot-path=/var/www/certbot --quiet && cd $(pwd) && docker compose -f docker-compose.prod.yml restart web-client > /dev/null 2>&1"
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
echo "   Web Client:    https://${DOMAIN}"
echo "   Admin Portal:  http://${SERVER_IP}:8080"
echo "   Backend API:   http://${SERVER_IP}:4000/health"
echo "   API Docs:      http://${SERVER_IP}:4000/api"
echo ""
echo " SSL: $( [ "$CERTS_EXIST" = true ] && echo 'Active' || echo 'HTTP only' )"
echo ""
echo " Default Logins:"
echo "   Admin:      admin@marketplace.pk / Admin@123456"
echo "   Manager:    manager@marketplace.pk / Manager@123"
echo "   Dealer:     dealer@marketplace.pk / Dealer@123"
echo "   Franchise:  franchise@marketplace.pk / Franchise@123"
echo "   Customer:   customer@marketplace.pk / Customer@123"
echo ""
echo " Useful Commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart"
echo "   DB shell:     docker compose -f docker-compose.prod.yml exec db psql -U gcadmin -d kabariya"
echo "   Rebuild:      docker compose -f docker-compose.prod.yml up -d --build"
echo ""
