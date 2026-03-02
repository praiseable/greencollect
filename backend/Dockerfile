FROM node:18-alpine

WORKDIR /app

# Install OpenSSL — required by Prisma on Alpine Linux
RUN apk add --no-cache openssl openssl-dev

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma client (uses binaryTargets from schema)
RUN npx prisma generate

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
