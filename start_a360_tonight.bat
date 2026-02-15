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

echo Starting Python watcher...
start "A360 Watcher" cmd /k "python python\a360_watcher.py"

echo Starting Electron UI...
start "A360 UI" cmd /k "npm run start"

echo.
echo If the watcher fails due to missing Python deps:

echo   pip install -r python\requirements.txt

echo.
endlocal
