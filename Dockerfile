FROM node:20-slim

WORKDIR /src

# Copy package files first for better layer caching
COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN cd server && npm install --production && cd ../client && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Expose port (Zeabur injects PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "server/src/index.js"]
