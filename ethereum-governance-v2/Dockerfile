# Build stage: compile Typescript to Javascript
FROM node:20.10.0-alpine3.18 AS builder

WORKDIR /app

COPY . .
RUN yarn install --immutable && yarn run build
# Build app
RUN yarn run build

# Final stage: copy compiled Javascript from previous stage and run the app
FROM node:20.10.0-alpine3.18 as production
LABEL "network.forta.settings.agent-logs.enable"="true"
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src
COPY version.json ./

CMD ["yarn", "run", "start:prod"]
