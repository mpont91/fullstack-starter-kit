#!/bin/sh
# backup         one backup every night at 03:00 UTC, forever (the service)
# backup once    one backup now (`make backup`)
# backup restore [FILE]
#                download FILE (the latest daily/ backup by default) and
#                restore it into <POSTGRES_DB>_restore, never the live
#                database (`make restore`)
set -eu
set -o pipefail

# curl that prints B2's error message when a call fails.
b2() {
  out=$(curl --fail-with-body -sS "$@") || { echo "$out" >&2 && return 1; }
  echo "$out"
}

# A Backblaze B2 key restricted to the backup bucket. Only its bucket comes
# back from the authorisation, so the bucket is never configured separately.
# Sets $api, $download, $bucket, $bucket_name and $token.
authorize() {
  auth=$(b2 -u "$1:$2" \
    https://api.backblazeb2.com/b2api/v4/b2_authorize_account)
  api=$(echo "$auth" | jq -er .apiInfo.storageApi.apiUrl)
  download=$(echo "$auth" | jq -er .apiInfo.storageApi.downloadUrl)
  allowed=$(echo "$auth" | jq -er '.apiInfo.storageApi.allowed.buckets
    | if length == 1 then .[0] else error("restrict the key to one bucket")
      end')
  bucket=$(echo "$allowed" | jq -er .id)
  bucket_name=$(echo "$allowed" | jq -er .name)
  token=$(echo "$auth" | jq -er .authorizationToken)
}

upload() {
  file=$1
  name=$2
  authorize "$BACKUP_B2_KEY_ID" "$BACKUP_B2_APPLICATION_KEY"
  target=$(b2 -H "Authorization: $token" \
    "$api/b2api/v4/b2_get_upload_url?bucketId=$bucket")
  b2 -H "Authorization: $(echo "$target" | jq -er .authorizationToken)" \
    -H "X-Bz-File-Name: $name" \
    -H 'Content-Type: application/octet-stream' \
    -H "X-Bz-Content-Sha1: $(sha1sum "$file" | cut -d' ' -f1)" \
    --data-binary "@$file" \
    "$(echo "$target" | jq -er .uploadUrl)" > /dev/null
  echo "backup: uploaded $name"
}

# Encrypted to the owner's public key: the server can download a backup but
# never decrypt one, so neither a stolen server nor the provider can open them.
once() {
  file=/tmp/$(date -u +%Y-%m-%dT%H%MZ).dump.age
  trap 'rm -f "$file"' EXIT
  pg_dump --format=custom | age -r "$BACKUP_AGE_RECIPIENT" > "$file"
  # Retention is the bucket's lifecycle rules, one per folder (7 days for
  # daily/, 28 for weekly/), not this script's.
  upload "$file" "daily/${file#/tmp/}"
  if [ "$(date -u +%u)" = 1 ]; then
    upload "$file" "weekly/${file#/tmp/}"
  fi
}

# A Sentry Crons check-in, through the API's own DSN. The first one creates the
# monitor with its schedule, so Sentry raises an issue for a backup that fails
# and for one that never runs (a missed check-in), the server's or the
# service's death included. Without SENTRY_DSN, nothing. A check-in that can't
# be sent is printed and never stops the backup.
checkin() {
  [ -n "${SENTRY_DSN:-}" ] || return 0
  key=${SENTRY_DSN#*//}
  key=${key%%@*}
  host=${SENTRY_DSN#*@}
  host=${host%%/*}
  project=${SENTRY_DSN##*/}
  curl -fsS -X POST -H 'Content-Type: application/json' \
    "https://$host/api/$project/cron/nightly-backup/$key/" \
    --data "{\"status\": \"$1\", \"monitor_config\": {
      \"schedule\": {\"type\": \"crontab\", \"value\": \"0 3 * * *\"},
      \"timezone\": \"UTC\", \"checkin_margin\": 30, \"max_runtime\": 30}}" \
    > /dev/null || echo "backup: check-in failed" >&2
}

nightly() {
  while true; do
    now=$(date -u +%s)
    next=$((now - now % 86400 + 3 * 3600))
    [ "$next" -gt "$now" ] || next=$((next + 86400))
    sleep $((next - now))
    checkin in_progress
    # A child process, so `set -e` stops the backup that failed and not the
    # loop.
    if "$0" once; then
      checkin ok
    else
      echo "backup: failed" >&2
      checkin error
    fi
  done
}

# The dump is downloaded still encrypted; the owner's private key is pasted,
# never stored, and goes to age through a pipe, so it's never on disk, not even
# on the server's.
restore() {
  authorize "$BACKUP_B2_KEY_ID" "$BACKUP_B2_APPLICATION_KEY"
  # Names are timestamps, so the latest sorts last.
  list="$api/b2api/v4/b2_list_file_names?bucketId=$bucket&prefix=daily/"
  name=${1:-$(b2 -H "Authorization: $token" "$list&maxFileCount=1000" \
    | jq -er '[.files[].fileName] | max')}
  file=/tmp/dump.age
  trap 'rm -f "$file"' EXIT
  curl -fsS -H "Authorization: $token" -o "$file" \
    "$download/file/$bucket_name/$name"
  echo "restore: downloaded $name"

  printf 'Private age key (AGE-SECRET-KEY-1…): '
  read -rs key
  echo

  target=${PGDATABASE}_restore
  dropdb --if-exists "$target"
  createdb "$target"
  echo "$key" | age -d -i - "$file" \
    | pg_restore --no-owner --no-acl -d "$target"
  psql -d "$target" -c 'SELECT
    (SELECT count(*) FROM "User") AS users,
    (SELECT max("createdAt") FROM "User") AS last_sign_up'
}

case ${1:-nightly} in
  nightly) nightly ;;
  once) once ;;
  restore) restore "${2:-}" ;;
  *) echo "usage: backup [once|restore [FILE]]" >&2 && exit 2 ;;
esac
