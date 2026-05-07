FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY health-monitor.ts ./

ENV NODE_ENV=production

CMD ["npx", "tsx", "health-monitor.ts"]