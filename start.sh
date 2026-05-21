#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Claudio – Avvio backend..."
cd "$ROOT"

# Install backend deps if needed
if [ ! -f ".venv/bin/python" ]; then
  echo "📦 Creazione virtualenv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r backend/requirements.txt
playwright install chromium --with-deps 2>/dev/null || playwright install chromium

echo "🌐 Avvio frontend..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "📦 Installazione dipendenze npm..."
  npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

echo "⚙️  Avvio FastAPI..."
cd "$ROOT"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo ""
echo "✅ Claudio è avviato!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Premi Ctrl+C per fermare."

trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT TERM
wait
