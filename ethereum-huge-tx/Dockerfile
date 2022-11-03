# Build stage: compile Typescript to Javascript
FROM node:16.17.1-alpine3.16 AS base

FROM base as builder
WORKDIR /app

COPY package*.json .yarnrc.yml yarn.lock ./
COPY .yarn/releases ./.yarn/releases/
RUN yarn install --immutable

COPY . .
RUN yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
LABEL "network.forta.settings.agent-logs.enable"="true"
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache tini=0.19.0-r0

COPY package*.json .yarnrc.yml yarn.lock ./
COPY .yarn/releases ./.yarn/releases/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "run", "start:prod"]
