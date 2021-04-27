FROM node:16-alpine
LABEL name "didinele.me main website"

ARG DASH_ENV=dev

WORKDIR /opt/build

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps curl git python3 alpine-sdk

RUN curl -L https://unpkg.com/@pnpm/self-installer | node

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

COPY libs/core/package.json ./libs/core/
COPY services/personal/package.json ./services/personal/package.json

RUN pnpm i --frozen-lockfile

COPY libs/core ./libs/core
COPY services/personal ./services/personal

RUN if [ "$DASH_ENV" = "prod" ]; then pnpm run build; fi
RUN pnpm prune --prod
