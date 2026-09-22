# Build a partir da raiz do repositório: docker build -f agent-server/Dockerfile .
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/lib ./src/lib
COPY agent-server ./agent-server
ENV NODE_ENV=production FORGE_AGENT_CONFIG_DIR=/tmp/claude
USER node
EXPOSE 8787
CMD ["npx", "tsx", "agent-server/server.ts"]
