#!/bin/bash
# Attente de Redis (timeout 30 s)
TIMEOUT=30
ELAPSED=0
HOST=${REDIS_HOST:-red-d9k744ht0dsc7393gf3g}
PORT=${REDIS_PORT:-6379}
echo "🔎 Attente de la disponibilité de Redis ($HOST:$PORT)…"
while ! (echo > /dev/tcp/$HOST/$PORT) 2>/dev/null; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "❌ Timeout : Redis n’est pas joignable après $TIMEOUT secondes."
    exit 1
  fi
done
echo "✅ Redis accessible – lancement du serveur Node"
exec npm start
