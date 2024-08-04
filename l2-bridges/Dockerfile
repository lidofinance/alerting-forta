# Build stage: compile Typescript to Javascript
FROM node:20.9.0-alpine3.18 AS base

FROM base as builder

ARG L2_NETWORK_NAME
ENV L2_NETWORK_NAME ${L2_NETWORK_NAME}

WORKDIR /app

COPY package.json yarn.lock tsconfig.json \
  version.json \
  start-agent.ts \
  ./

COPY common ./common/
COPY $L2_NETWORK_NAME ./$L2_NETWORK_NAME/

RUN yarn install --frozen-lockfile

# Build app
RUN yarn build

CMD yarn start ${L2_NETWORK_NAME} prod
