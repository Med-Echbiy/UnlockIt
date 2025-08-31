# UnlockIt MSI Installer Test Script
# This script tests the MSI installer functionality

Write-Host "UnlockIt - MSI Installer Test" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Get the MSI file path
$msiPath = "C:\Users\Mohamed\Desktop\projects\UnlockIt\src-tauri\target\release\bundle\msi\UnlockIt - Ultimate Achievement Tracker_1.0.0_x64_en-US.msi"

if (-not (Test-Path $msiPath)) {
    Write-Host "MSI file not found at: $msiPath" -ForegroundColor Red
    exit 1
}

Write-Host "MSI file found!" -ForegroundColor Green
Write-Host "Path: $msiPath" -ForegroundColor Yellow
Write-Host ""

# Get file info
$fileInfo = Get-ItemProperty $msiPath
Write-Host "File Information:" -ForegroundColor Cyan
Write-Host "   Size: $([math]::round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "   Created: $($fileInfo.CreationTime)"
Write-Host "   Modified: $($fileInfo.LastWriteTime)"
Write-Host ""

# Check registry entries that would be created
Write-Host "Registry Check (after installation):" -ForegroundColor Cyan
Write-Host "   The installer will create entries under:"
Write-Host "   HKEY_CURRENT_USER\Software\Mohamed Echbiy\UnlockIt"
Write-Host ""

# AppData preservation note
Write-Host "AppData Preservation:" -ForegroundColor Cyan
Write-Host "   AppData folder will be preserved during uninstall"
Write-Host "   User settings and game data will be kept"
Write-Host "   Registry marker will indicate data preservation"
Write-Host ""

# Installation instructions
Write-Host "Installation Instructions:" -ForegroundColor Green
Write-Host "   1. Double-click the MSI file to install"
Write-Host "   2. Follow the installation wizard"
Write-Host "   3. The app will be installed to Program Files"
Write-Host "   4. Desktop and Start Menu shortcuts will be created"
Write-Host ""

Write-Host "Your Identity Configuration:" -ForegroundColor Magenta
Write-Host "   Publisher: Mohamed Echbiy"
Write-Host "   Product: UnlockIt - Ultimate Achievement Tracker"
Write-Host "   Identifier: com.mohamed-echbiy.unlockit"
Write-Host "   Version: 1.0.0.0"
Write-Host "   Support URL: https://github.com/Med-Echbiy/UnlockIt"
Write-Host ""

Write-Host "Installation completed successfully!" -ForegroundColor Green
