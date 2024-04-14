FROM node:18 AS builder
WORKDIR /app
RUN npm install pm2 -g
COPY package*.json ./
RUN yarn install
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 5432
CMD ["yarn", "start"]
