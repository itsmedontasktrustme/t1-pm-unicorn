#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/docker-entrypoint-startdb.d}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-homekeeper}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"

if [ -n "${MYSQL_ROOT_PASSWORD_FILE:-}" ] && [ -z "$MYSQL_PASSWORD" ]; then
  MYSQL_PASSWORD="$(cat "$MYSQL_ROOT_PASSWORD_FILE")"
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migration directory not found: $MIGRATIONS_DIR"
  exit 0
fi

mapfile -t files < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No SQL migrations found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${files[@]}"; do
  echo "Applying migration: ${file##*/}"
  mysql --host="$MYSQL_HOST" --port="$MYSQL_PORT" --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$file"
done
