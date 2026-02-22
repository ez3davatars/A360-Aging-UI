@echo off
setlocal
cd /d "%~dp0"

echo.
echo =============================================
echo A360 Tonight Starter
echo =============================================
echo.

echo IMPORTANT: Close the Excel workbook before starting the watcher.
echo.

echo Initializing environment...
echo Cleaning up old A360 processes...

:: More aggressive cleanup
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul

:: Kill any process holding the specific ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8765') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do taskkill /F /PID %%a 2>nul

timeout /t 3 /nobreak >nul

echo Starting Python watcher...
start "A360 Watcher" cmd /k "python python\a360_watcher.py"

echo Starting Electron UI (Production Build)...
start "A360 UI" cmd /k "npm run electron"

echo.
echo If the watcher fails due to missing Python deps:

echo   pip install -r python\requirements.txt

echo.
endlocal
