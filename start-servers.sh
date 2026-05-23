#!/bin/bash

# Athens 2.0 - Quick Start Script
# Starts both backend and frontend servers

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          ATHENS 2.0 - QUICK START                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :8004 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠  Backend already running on port 8004${NC}"
else
    echo -e "${GREEN}Starting backend server...${NC}"
    cd backend
    source .venv/bin/activate
    python manage.py runserver 0.0.0.0:8004 > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    sleep 3
fi

# Check if frontend is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠  Frontend already running on port 5173${NC}"
else
    echo -e "${GREEN}Starting frontend server...${NC}"
    cd frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
    sleep 3
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          SERVERS STARTED                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓${NC} Backend:  http://localhost:8004"
echo -e "${GREEN}✓${NC} Frontend: http://localhost:5173"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "To stop servers:"
echo "  ./stop-servers.sh"
echo ""
