FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5002

CMD ["node", "src/index.js"]
