@echo off
echo Starting Seasons Wheel VR Server...
echo.
echo Once started, open this URL on your Quest 2:
echo https://192.168.1.21:5173
echo.
echo Press Ctrl+C to stop the server.
echo.
cd /d "%~dp0"
npx vite
pause
