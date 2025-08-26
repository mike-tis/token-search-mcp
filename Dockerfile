FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose the port your application listens on (adjust if needed)
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
