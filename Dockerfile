FROM node:18 AS builder
WORKDIR /epns-showrunners-frameworks
COPY package*.json ./
RUN yarn install --check-files
COPY . .

FROM node:18-alpine
WORKDIR /epns-showrunners-frameworks
COPY --from=builder /epns-showrunners-frameworks /epns-showrunners-frameworks
RUN npm install pm2 -g
EXPOSE 5432
CMD ["sh", "runner.sh"]
