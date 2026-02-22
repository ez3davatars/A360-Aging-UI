@echo off
echo =============================================
echo A360 Process Cleanup
echo =============================================
echo.
echo This script will terminate any hanging A360 processes.
echo.

echo Cleaning up Python processes...
taskkill /F /IM python.exe /T 2>nul

echo Cleaning up Node/Vite processes...
taskkill /F /IM node.exe /T 2>nul

echo Cleaning up Electron processes...
taskkill /F /IM electron.exe /T 2>nul

echo.
echo Done! You can now run start_a360_tonight.bat safely.
echo.
pause
