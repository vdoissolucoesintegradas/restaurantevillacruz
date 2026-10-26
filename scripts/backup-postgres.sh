#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${UPLOAD_DIR:=./data/uploads}"
: "${BACKUP_DIR:=./backups}"
command -v pg_dump >/dev/null 2>&1 || { echo 'pg_dump is required' >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo 'tar is required' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"
work="$BACKUP_DIR/.villa-cruz-$stamp"
mkdir -m 700 "$work"
trap 'rm -rf "$work"' EXIT HUP INT TERM
pg_dump --format=custom --no-owner --no-acl --file "$work/database.dump" "$DATABASE_URL"
if [ -d "$UPLOAD_DIR" ]; then tar -C "$UPLOAD_DIR" -czf "$work/uploads.tar.gz" .; else tar -czf "$work/uploads.tar.gz" --files-from /dev/null; fi
sha256sum "$work/database.dump" "$work/uploads.tar.gz" > "$work/SHA256SUMS"
tar -C "$work" -czf "$BACKUP_DIR/villa-cruz-$stamp.tar.gz" .
echo "Backup created: $BACKUP_DIR/villa-cruz-$stamp.tar.gz"
