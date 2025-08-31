# Build script for UnlockIt with updater signing
# This script sets the required environment variables and builds the application

param(
    [string]$KeyPassword = "",
    [switch]$Release = $false
)

Write-Host "=== UnlockIt Build Script ===" -ForegroundColor Green
Write-Host ""

# Check if key files exist
if (-not (Test-Path "unlockit.key")) {
    Write-Host "❌ Private key 'unlockit.key' not found!" -ForegroundColor Red
    Write-Host "   Run: pnpm tauri signer generate -w unlockit.key" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "unlockit.key.pub")) {
    Write-Host "❌ Public key 'unlockit.key.pub' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Key files found" -ForegroundColor Green

# Set environment variables
Write-Host "🔐 Setting up signing environment..." -ForegroundColor Blue
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "unlockit.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $KeyPassword

# Build command
$buildArgs = if ($Release) { "build" } else { "build --debug" }
Write-Host "🔨 Building application..." -ForegroundColor Blue
Write-Host "   Command: pnpm tauri $buildArgs" -ForegroundColor Gray

try {
    Invoke-Expression "pnpm tauri $buildArgs"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
        
        $bundlePath = if ($Release) { "src-tauri\target\release\bundle" } else { "src-tauri\target\debug\bundle" }
        if (Test-Path $bundlePath) {
            Write-Host "📦 Build artifacts:" -ForegroundColor Blue
            Get-ChildItem "$bundlePath\msi\*" | ForEach-Object {
                Write-Host "   $($_.Name)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Build error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Done! You can now test the installer or create a GitHub release." -ForegroundColor Green
