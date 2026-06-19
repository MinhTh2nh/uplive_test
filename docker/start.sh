#!/bin/sh
set -eu

echo "Waiting for PostgreSQL and applying schema..."

attempt=0
max_attempts=20

until npx prisma db push; do
  attempt=$((attempt + 1))

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma db push failed after $max_attempts attempts."
    exit 1
  fi

  echo "Database not ready yet. Retrying in 3 seconds..."
  sleep 3
done

echo "Starting Next.js app..."
exec npm start
