FROM --platform=$BUILDPLATFORM riscv64/ubuntu:latest AS FRONT
RUN apt-get update && apt-get install -y nodejs npm
RUN npm install -g yarn

WORKDIR /web
COPY ./web .
ENV NODE_OPTIONS="--max-old-space-size=4144"
RUN yarn install --frozen-lockfile --network-timeout 1000000 && yarn run build

FROM --platform=$BUILDPLATFORM riscv64/golang:1.23.11-alpine3.21 AS BACK
WORKDIR /go/src/openagent
COPY . .
RUN chmod +x ./build.sh
RUN sh ./build.sh


FROM riscv64/alpine:latest AS STANDARD
LABEL MAINTAINER="https://openagentai.org/"
ARG USER=openagent
ARG TARGETOS
ARG TARGETARCH
ENV BUILDX_ARCH="${TARGETOS:-linux}_${TARGETARCH:-amd64}"

RUN sed -i 's/https/http/' /etc/apk/repositories
RUN apk add --update sudo
RUN apk add curl
RUN apk add ca-certificates && update-ca-certificates

RUN adduser -D $USER -u 1000 \
    && echo "$USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USER \
    && chmod 0440 /etc/sudoers.d/$USER \
    && mkdir logs \
    && chown -R $USER:$USER logs

USER 1000
WORKDIR /
COPY --from=BACK --chown=$USER:$USER /go/src/openagent/server_${BUILDX_ARCH} ./server
COPY --from=BACK --chown=$USER:$USER /go/src/openagent/data ./data
COPY --from=BACK --chown=$USER:$USER /go/src/openagent/conf/app.conf ./conf/app.conf
COPY --from=FRONT --chown=$USER:$USER /web/build ./web/build

ENTRYPOINT ["/server"]

FROM riscv64/ubuntu:latest AS db
RUN apt update \
    && apt install -y \
        mariadb-server \
        mariadb-client \
    && rm -rf /var/lib/apt/lists/*

FROM db AS ALLINONE
LABEL MAINTAINER="https://openagentai.org/"
ARG TARGETOS
ARG TARGETARCH
ENV BUILDX_ARCH="${TARGETOS:-linux}_${TARGETARCH:-riscv64}"

RUN apt update
RUN apt install -y ca-certificates && update-ca-certificates

WORKDIR /
COPY --from=BACK /go/src/openagent/server_${BUILDX_ARCH} ./server
COPY --from=BACK /go/src/openagent/data ./data
COPY --from=BACK /go/src/openagent/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=BACK /go/src/openagent/conf/app.conf ./conf/app.conf
COPY --from=FRONT /web/build ./web/build
ENTRYPOINT ["/bin/bash"]
CMD ["/docker-entrypoint.sh"]
