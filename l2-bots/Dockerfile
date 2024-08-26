FROM node:20.15.1-alpine3.20 AS base

RUN apk add --no-cache g++=13.2.1_git20240309-r0 make=4.4.1-r2 sqlite=3.45.3-r1

FROM base as builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
LABEL "network.forta.settings.agent-logs.enable"="true"


# Required ENV vars: ETHEREUM_RPC_URL, L2_RPC_URL, INSTANCE
# Optional ENV vars: LOG_FORMAT, LOG_LEVEL

# ENV APP_NAME=l2-optimism
# ENV NETWORK_NAME=Optimism
ENV NODE_ENV=production
# ENV ETHEREUM_RPC_URL=https://eth.drpc.org
# ENV ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/f055aaff9af648469883dee0b12e53ba
# ENV RPC_URL=https://arbitrum-one.publicnode.com

WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src

# No entry point: it is to be set in docker-compose
# CMD ["yarn", "run", "start:mantle:prod"]
# CMD ["yarn", "run", "start:optimism:prod"]
