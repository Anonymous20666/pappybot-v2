FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p data/session data/logs

ENV NODE_ENV=production

CMD ["node", "src/main.js"]
