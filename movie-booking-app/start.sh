#!/bin/bash
echo "🎬 CineBook — Starting up..."
echo ""

# Check MongoDB
if ! command -v mongod &> /dev/null; then
  echo "⚠️  MongoDB not found. Please install it first:"
  echo "   https://www.mongodb.com/try/download/community"
  exit 1
fi

# Start backend
echo "📦 Installing backend dependencies..."
cd backend && npm install --silent

echo "🌱 Seeding demo data..."
npm run seed

echo "🚀 Starting backend on http://localhost:5000 ..."
npm run dev &
BACKEND_PID=$!

# Start frontend
cd ../frontend
echo "📦 Installing frontend dependencies..."
npm install --silent

echo "🎨 Starting frontend on http://localhost:3000 ..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" SIGINT
wait
