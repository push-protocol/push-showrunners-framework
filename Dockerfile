FROM node:18 AS builder
WORKDIR /epns-showrunners-frameworks
COPY package*.json ./
RUN yarn install
RUN rm -rf yarn.lock
RUN yarn add @injectivelabs/chain-api@1.6.4
COPY . .

FROM node:18-alpine
WORKDIR /epns-showrunners-frameworks
COPY --from=builder /epns-showrunners-frameworks /epns-showrunners-frameworks
RUN npm install pm2 -g
EXPOSE 8080
EXPOSE 5432
CMD ["sh", "runner.sh"]
