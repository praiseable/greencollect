FROM node:18-alpine

WORKDIR /app

# Install OpenSSL — required by Prisma on Alpine Linux
RUN apk add --no-cache openssl openssl-dev

# Copy shared package (needed for constants) - maintain root structure
COPY packages ./packages/

# Copy backend directory structure to maintain relative paths
COPY backend ./backend/

# Move into backend directory for npm operations
WORKDIR /app/backend

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma client (uses binaryTargets from schema)
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Set working directory back to backend for runtime
WORKDIR /app/backend

EXPOSE 4000

CMD ["node", "src/index.js"]
