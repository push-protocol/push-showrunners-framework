FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install pm2 -g
COPY . .

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 5432
CMD ["pm2", "start"]
