FROM node:20-alpine

WORKDIR /app

# Install system dependencies if any (ffmpeg needed for thumbnail generation if server does simple processing)
RUN apk add --no-cache ffmpeg python3 make g++

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start"]
