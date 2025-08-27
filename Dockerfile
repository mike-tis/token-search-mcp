# Multi-stage build для Smithery
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build with Smithery CLI
RUN npx -y @smithery/cli build -o .smithery/index.cjs

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/.smithery/index.cjs ./index.cjs
COPY --from=builder /app/package.json ./package.json

# Expose port (Smithery обычно использует 8080)
EXPOSE 8080

# Start the server
CMD ["node", "index.cjs"]