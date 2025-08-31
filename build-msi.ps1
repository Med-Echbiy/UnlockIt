# UnlockIt MSI Build Script
# Builds the MSI installer for UnlockIt - Ultimate Achievement Tracker

Write-Host "🎮 Building UnlockIt MSI Installer..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "src-tauri/tauri.conf.json")) {
    Write-Host "❌ Error: Must be run from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if Rust and Tauri CLI are installed
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow

try {
    $rustVersion = cargo --version 2>$null
    if ($?) {
        Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
    } else {
        throw "Rust not found"
    }
} catch {
    Write-Host "❌ Rust is not installed. Please install Rust first." -ForegroundColor Red
    Write-Host "   Visit: https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

try {
    $tauriVersion = cargo tauri --version 2>$null
    if ($?) {
        Write-Host "✅ Tauri CLI: $tauriVersion" -ForegroundColor Green
    } else {
        throw "Tauri CLI not found"
    }
} catch {
    Write-Host "⚠️  Tauri CLI not found. Installing..." -ForegroundColor Yellow
    cargo install tauri-cli --version "^2.0"
    if (!$?) {
        Write-Host "❌ Failed to install Tauri CLI" -ForegroundColor Red
        exit 1
    }
}

# Check for Node.js and pnpm
try {
    $nodeVersion = node --version 2>$null
    if ($?) {
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

try {
    $pnpmVersion = pnpm --version 2>$null
    if ($?) {
        Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
    } else {
        throw "pnpm not found"
    }
} catch {
    Write-Host "❌ pnpm is not installed. Please install pnpm first." -ForegroundColor Red
    Write-Host "   Run: npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Install frontend dependencies if needed
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
pnpm install
if (!$?) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# Build the frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
pnpm build
if (!$?) {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}

# Build the MSI installer
Write-Host "📦 Building MSI installer..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

# Change to src-tauri directory and build
Set-Location src-tauri
cargo tauri build --bundles msi
$buildResult = $?
Set-Location ..

if ($buildResult) {
    Write-Host "" -ForegroundColor Green
    Write-Host "🎉 MSI installer built successfully!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    
    # Find and display the MSI location
    $msiPath = Get-ChildItem -Path "src-tauri/target/release/bundle/msi" -Filter "*.msi" | Select-Object -First 1
    if ($msiPath) {
        Write-Host "📍 Installer location: $($msiPath.FullName)" -ForegroundColor Cyan
        Write-Host "📏 File size: $([math]::Round($msiPath.Length / 1MB, 2)) MB" -ForegroundColor Cyan
        
        # Ask if user wants to open the folder
        $response = Read-Host "🔍 Open installer folder? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            Start-Process explorer.exe -ArgumentList $msiPath.DirectoryName
        }
    }
    
    Write-Host "" -ForegroundColor Green
    Write-Host "🎮 Ready to distribute your UnlockIt installer!" -ForegroundColor Green
    Write-Host "   Your users can now install UnlockIt with preserved AppData" -ForegroundColor Gray
} else {
    Write-Host "" -ForegroundColor Red
    Write-Host "❌ MSI build failed!" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}
