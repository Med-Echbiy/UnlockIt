@echo off
echo === UnlockIt Quick Build ===
echo.

REM Check if PowerShell script exists
if not exist "build-signed.ps1" (
    echo Error: build-signed.ps1 not found!
    pause
    exit /b 1
)

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "build-signed.ps1" %*

pause
