# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the nats.Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.10.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base
WORKDIR /app

FROM base as builder
COPY package*.json .yarnrc.yml yarn.lock ./

COPY .yarn/releases ./.yarn/releases/

RUN yarn install --immutable

COPY . .

RUN yarn run build

# Final stage: copy compiled Javascript from previous stage and install production dependencies
FROM base as production
ENV NODE_ENV=production

COPY package*.json .yarnrc.yml yarn.lock ./
COPY .yarn/releases ./.yarn/releases/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./src

# Run the application.
CMD node src/main.js
