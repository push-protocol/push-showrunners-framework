FROM node:16 AS builder
RUN npm install -g yarn
WORKDIR /app
COPY package*.json ./
RUN yarn install
COPY . .

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 5432
CMD ["yarn", "start"]
