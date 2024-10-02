# Build stage: compile Typescript to Javascript
FROM node:20.10.0-alpine3.18 AS base

RUN apk add --no-cache tini==0.19.0-r1

FROM base AS builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base AS production
LABEL "network.forta.settings.agent-logs.enable"="true"

ENV APP_NAME=csm-alerts
ENV NODE_ENV=production

ENV LOG_FORMAT=simple
ENV LOG_LEVEL=info

WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "run", "start:docker:prod"]
