FROM node:20.16.0-alpine3.20 AS builder

RUN apk add --no-cache make=4.4.1-r2 sqlite=3.45.3-r1

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

FROM node:20.16.0-alpine3.20 as production
LABEL "network.forta.settings.agent-logs.enable"="true"

ENV APP_NAME=ethereum-steth
ENV NODE_ENV=production
ENV ETHEREUM_RPC_URL=https://eth.drpc.org

ENV AGENT_GRPC_PORT=50051
ENV HTTP_PORT=3000
ENV LOG_FORMAT=simple
ENV LOG_LEVEL=info
ENV INSTANCE=forta
ENV USE_FORTA_RPC_URL=true

WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

CMD ["yarn", "run", "start:docker:prod"]