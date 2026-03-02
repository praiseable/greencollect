# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-package-lock
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Store both configs
RUN mkdir -p /etc/nginx/templates /var/www/certbot
COPY nginx.conf /etc/nginx/templates/ssl.conf
COPY nginx-initial.conf /etc/nginx/templates/http-only.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80 443

# On start: pick SSL config if certs exist, otherwise HTTP-only
CMD ["/bin/sh", "-c", "if [ -f /etc/letsencrypt/live/gc.directconnect.services/fullchain.pem ]; then cp /etc/nginx/templates/ssl.conf /etc/nginx/conf.d/default.conf; echo 'Starting with HTTPS'; else cp /etc/nginx/templates/http-only.conf /etc/nginx/conf.d/default.conf; echo 'Starting with HTTP-only (no certs yet)'; fi && nginx -g 'daemon off;'"]
