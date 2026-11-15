#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 1. Start background Python server if not already active on port 8765
if lsof -Pi :8765 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo " Local sync server is already active on port 8765."
else
    echo " Starting local server & sync relay on port 8765..."
    python3 serve_sync.py > /dev/null 2>&1 &
    sleep 1
fi

LOCAL_IP=$(python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo "================================================================="
echo "   NEET-MDS Top-10 Planner - AIR 1-10 Universal Workstation"
echo "================================================================="
echo "    Mac / Desktop Web App : http://localhost:8765"
echo "   Android Phone Link     : http://${LOCAL_IP}:8765"
echo "================================================================="

# 2. Open native Mac app if present, or open default browser
if [ -d "$DIR/MDS_Desktop_OS.app" ]; then
    echo " Launching native AppKit desktop application..."
    open "$DIR/MDS_Desktop_OS.app" 2>/dev/null || open "http://localhost:8765"
elif which open >/dev/null 2>&1; then
    open "http://localhost:8765"
elif which xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:8765"
fi

echo " App launched successfully."
