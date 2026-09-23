# syntax=docker/dockerfile:1

FROM node:26-alpine AS web
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY client/ ./
ARG VITE_GIT_COMMIT
RUN npm run build

FROM golang:1.27-alpine AS build
WORKDIR /src
COPY server/ ./
RUN --mount=type=cache,target=/root/.cache/go-build --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM gcr.io/distroless/static-debian12
COPY --from=build /server /server
COPY --from=web /client/dist /dist
ENV ADDR=:8080 DIST=/dist
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
