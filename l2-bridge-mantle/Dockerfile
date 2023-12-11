# Build stage: compile Typescript to Javascript
FROM node:20.9.0-alpine3.18 AS base

FROM base as builder

WORKDIR /app

COPY . .
RUN yarn install --immutable

RUN yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
LABEL "network.forta.settings.agent-logs.enable"="true"
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

CMD ["yarn", "run", "start:prod"]