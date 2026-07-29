#!/bin/bash
# Attente optionnelle de Redis (NON bloquant — Redis est optionnel)
# Le serveur Node démarre même si Redis est injoignable.
TIMEOUT=${REDIS_WAIT_TIMEOUT:-10}
ELAPSED=0
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PORT=${REDIS_PORT:-6379}

echo "🔎 Vérification optionnelle de Redis ($REDIS_HOST:$REDIS_PORT)…"
while ! (echo > /dev/tcp/$REDIS_HOST/$REDIS_PORT) 2>/dev/null; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    break
  fi
done

if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
  echo "⚠️  Redis non joignable — démarrage quand même (fonctions temps réel dégradées)."
else
  echo "✅ Redis accessible — lancement du serveur Node"
fi

exec npm start
