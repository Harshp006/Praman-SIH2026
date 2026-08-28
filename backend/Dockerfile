FROM node:20-alpine

# Dependencies for Prisma native binary
RUN apk add --no-cache openssl

# Create uploads directory — writable by node process
RUN mkdir -p /uploads/tmp && chmod -R 777 /uploads

WORKDIR /app

# Copy package manifests and install
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY src ./src

EXPOSE 4000

# Startup command is specified by docker-compose (prisma db push → seed → server)
CMD ["node", "src/index.js"]

