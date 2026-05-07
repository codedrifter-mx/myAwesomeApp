FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_AUTH_URL=http://auth-service:3001
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_AUTH_URL=http://auth-service:3001
ENV NEXT_PUBLIC_LIVEOPS_URL=http://liveops-backend:4000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]