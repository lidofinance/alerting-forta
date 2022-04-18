# Build stage: compile Typescript to Javascript
FROM node:12-alpine AS builder
WORKDIR /app
COPY package*.json .yarnrc.yml yarn.lock ./
COPY .yarn/releases ./.yarn/releases/
RUN yarn install && yarn cache clean
COPY . .
RUN yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM node:12-alpine
LABEL "network.forta.settings.agent-logs.enable"="true"
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json .yarnrc.yml yarn.lock ./
COPY .yarn/releases ./.yarn/releases/
COPY --from=builder /app/.yarn/cache ./.yarn/cache
RUN yarn install --immutable && yarn cache clean
COPY --from=builder /app/dist ./src
COPY version.json ./
CMD [ "yarn", "run", "start:prod" ]
