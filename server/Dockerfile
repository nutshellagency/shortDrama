FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY src ./src

EXPOSE 3000

# POC: sync schema to DB on startup, then run server
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/db?schema=public
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push && npm run start"]


