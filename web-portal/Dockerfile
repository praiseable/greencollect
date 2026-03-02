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
COPY nginx.conf /etc/nginx/conf.d/ssl.conf.template
COPY nginx-initial.conf /etc/nginx/conf.d/initial.conf
RUN mkdir -p /var/www/certbot
EXPOSE 80 443

# Start with HTTP-only config; if SSL certs exist, use full SSL config
CMD ["/bin/sh", "-c", "if [ -f /etc/letsencrypt/live/gc.directconnect.services/fullchain.pem ]; then cp /etc/nginx/conf.d/ssl.conf.template /etc/nginx/conf.d/default.conf; else cp /etc/nginx/conf.d/initial.conf /etc/nginx/conf.d/default.conf; fi && nginx -g 'daemon off;'"]
