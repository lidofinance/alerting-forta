# Build stage: compile Typescript to Javascript
FROM node:20.10.0-alpine3.18 AS base

RUN apk add --no-cache python3=3.11.6-r0 g++=12.2.1_git20220924-r10 make=4.4.1-r1 sqlite=3.41.2-r3

FROM base as builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build
# Build app
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