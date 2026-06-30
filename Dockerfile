FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY start.sh ./
COPY check.sh ./
COPY public ./public
COPY scripts ./scripts

ENV HOST=0.0.0.0
ENV PORT=5173
EXPOSE 5173

CMD ["node", "server.js"]
