@echo off
echo 🎮 UnlockIt MSI Builder
echo ====================
echo.

rem Check if we're in the right directory
if not exist "src-tauri\tauri.conf.json" (
    echo ❌ Error: Must be run from the project root directory
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
call pnpm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🏗️ Building frontend...
call pnpm build
if errorlevel 1 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

echo 📦 Building MSI installer...
echo This may take several minutes...
cd src-tauri
call cargo tauri build --bundles msi
if errorlevel 1 (
    echo ❌ MSI build failed
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo 🎉 MSI installer built successfully!
echo Check src-tauri\target\release\bundle\msi\ for your installer
echo.
pause
