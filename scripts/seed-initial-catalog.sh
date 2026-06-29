#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_FILE="${ROOT_DIR}/supabase/seed.sql"

if command -v supabase >/dev/null 2>&1; then
  echo "Applying seed via Supabase CLI..."
  supabase db execute --file "${SEED_FILE}"
  exit 0
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Applying seed via psql..."
  psql "${DATABASE_URL}" --file "${SEED_FILE}"
  exit 0
fi

echo "Unable to apply seed."
echo "Install the Supabase CLI and link the project, or set DATABASE_URL."
echo "Seed file: ${SEED_FILE}"
exit 1
