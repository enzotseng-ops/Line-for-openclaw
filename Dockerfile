FROM node:20-bookworm-slim AS client-build
WORKDIR /src/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/ ./server/
COPY --from=client-build /src/client/dist ./client/dist
RUN mkdir -p /app/server/uploads/knowledge && chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD curl -fsS http://127.0.0.1:8080/health >/dev/null || exit 1
CMD ["node","server/src/index.js"]
