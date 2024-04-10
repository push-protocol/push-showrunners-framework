FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g yarn
RUN yarn install
COPY . .

FROM node:16-alpine
WORKDIR /app
COPY --from=builder /app /app
RUN npm install -g yarn
EXPOSE 5432
CMD ["yarn", "start"]
