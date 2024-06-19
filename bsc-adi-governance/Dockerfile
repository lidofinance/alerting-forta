# Build stage: compile Typescript to Javascript
FROM node:20.10.0-alpine3.18 AS base

FROM base as builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
LABEL "network.forta.settings.agent-logs.enable"="true"
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache tini=0.19.0-r0

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "run", "start:prod"]
