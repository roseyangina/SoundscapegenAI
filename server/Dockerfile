FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "express_backend.js"]
