FROM node:16-alpine
LABEL name "didinele.me auth builder"

WORKDIR /opt/build

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps curl git python3 alpine-sdk

RUN curl -L https://unpkg.com/@pnpm/self-installer | node

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

COPY libs/core/package.json ./libs/core/
COPY libs/injection/package.json ./libs/injection/
COPY libs/logger/package.json ./libs/logger/
COPY libs/rest/package.json ./libs/rest/
COPY services/auth/package.json ./services/auth/package.json

RUN pnpm i --frozen-lockfile && apk del .build-deps

COPY libs/core ./libs/core
COPY libs/injection ./libs/injection
COPY libs/logger ./libs/logger
COPY libs/rest ./libs/rest
COPY services/auth ./services/auth

RUN pnpm run build && pnpm prune --prod

FROM node:16-alpine
LABEL name "didinele.me auth"
LABEL version "0.1.0"

WORKDIR /usr/auth

COPY --from=0 /opt/build ./

CMD ["node", "--enable-source-maps", "services/auth/dist/index.js"]
