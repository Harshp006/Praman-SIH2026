FROM node:20-alpine

# Install dependencies needed for Prisma native binary
RUN apk add --no-cache openssl

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

# CMD is intentionally omitted — Layer 2 will wire the real start command.
# Docker Compose's entrypoint override will handle startup.
CMD ["node", "-e", "console.log('Praman backend container ready — awaiting Layer 2 start command'); require('http').createServer((_,r)=>r.end('ok')).listen(4000)"]
