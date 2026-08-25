# Phase 0 compile service. Tectonic with no shell escape, no network.
# Multi-stage would be nicer but tectonic is a single binary, so a single
# FROM is fine and gives the smallest image.
FROM ghcr.io/tectonic-typesetting/tectonic:latest AS tectonic

# Runtime image: alpine + the tectonic binary, then a non-root user.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=tectonic /usr/local/bin/tectonic /usr/local/bin/tectonic
RUN addgroup -S compile && adduser -S compile -G compile
USER compile
WORKDIR /tmp
EXPOSE 4000
CMD ["node", "dist/index.js"]
