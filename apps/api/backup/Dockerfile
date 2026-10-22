# The nightly backup. Same Postgres as the `db` service, so pg_dump and
# pg_restore always match the server's major version.
FROM postgres:18-alpine

RUN apk add --no-cache age curl jq

COPY backup.sh /usr/local/bin/backup

ENTRYPOINT ["backup"]
