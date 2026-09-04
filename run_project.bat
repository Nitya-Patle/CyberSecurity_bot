@echo off
echo Starting CyberSentinel...

start cmd /k "cd backend && ..\venv\Scripts\python.exe main.py"
start cmd /k "cd frontend && npm run dev"

echo Backend and Frontend are starting!
echo Frontend will be available at: http://localhost:5173
