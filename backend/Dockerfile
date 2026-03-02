FROM node:18-alpine

WORKDIR /app

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (triggers prisma generate via postinstall)
RUN npm install --omit=dev
RUN npx prisma generate

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 4000

CMD ["node", "src/index.js"]
