FROM node:16 AS builder
WORKDIR /app
RUN npm install pm2 -g
RUN npm install yarn -g
COPY package*.json ./
RUN yarn install
COPY . .

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app /app
RUN npm install yarn -g
EXPOSE 5432
CMD ["yarn", "start"]
