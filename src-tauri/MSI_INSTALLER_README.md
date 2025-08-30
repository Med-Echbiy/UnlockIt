# UnlockIt MSI Installer Configuration

This document explains the MSI installer configuration for UnlockIt - Ultimate Achievement Tracker.

## Configuration Overview

The MSI installer is configured using WiX (Windows Installer XML) toolset with the following components:

### Files Created:

- `main.wxs` - Main WiX template with product definition
- `fragments.wxs` - Additional UI fragments and components
- `resources/LICENSE.rtf` - End-User License Agreement
- `tauri.conf.json` - Updated Tauri configuration

### Key Features:

#### 1. Product Information

- **Product Name**: UnlockIt - Ultimate Achievement Tracker
- **Publisher**: Mohamed Echbiy
- **Category**: Game
- **Install Scope**: Per-machine installation
- **Platform**: x64 (64-bit)

#### 2. Installation Features

- **Desktop Shortcut**: Optional desktop shortcut creation
- **Start Menu Integration**: Automatic start menu shortcuts
- **Auto-start Option**: Option to start with Windows
- **File Associations**: Associates with game save files (.sav, .dat)
- **Uninstaller**: Proper uninstall support with cleanup

#### 3. System Requirements

- Windows 10 or higher
- 64-bit operating system
- Microsoft Edge WebView2 Runtime (auto-installed if missing)

#### 4. Installer Customization

- Custom welcome dialog
- Installation options dialog
- Progress tracking
- License agreement display
- Launch application option after installation

#### 5. Registry Integration

- Application registration in Windows
- File type associations
- Auto-start registry entries
- Proper cleanup on uninstall

## Building the MSI Installer

To build the MSI installer, run:

```powershell
pnpm tauri build
```

The installer will be generated in the `src-tauri/target/release/bundle/msi/` directory.

## Customization Options

### Modifying Installation Options

Edit `fragments.wxs` to add or modify installation options:

- Desktop shortcut creation
- Auto-start functionality
- File associations
- Additional registry entries

### Changing Product Information

Update `main.wxs` to modify:

- Product name and description
- Publisher information
- Version information
- Installation directory
- System requirements

### Adding Custom Actions

You can add custom actions for:

- Pre/post installation tasks
- Service installation
- Database setup
- Configuration file creation

### UI Customization

The installer UI can be customized by:

- Modifying dialog layouts
- Adding custom dialogs
- Changing text and labels
- Adding custom images

## Advanced Configuration

### Component Structure

The installer creates these main components:

- `UnlockItComponent` - Main application files
- `ApplicationShortcutComponent` - Start menu shortcuts
- `AutoStartComponent` - Windows startup integration
- `FileAssociationComponent` - File type associations
- `CleanupComponent` - Uninstall cleanup

### Upgrade Handling

The installer supports:

- Major upgrades (newer versions)
- Version detection
- Automatic uninstall of older versions
- Downgrade prevention

### Error Handling

Built-in error handling for:

- System requirement checks
- WebView2 runtime installation
- Registry access permissions
- File system permissions

## Troubleshooting

### Common Issues:

1. **Build Errors**: Ensure WiX toolset is installed
2. **Permission Issues**: Run as administrator if needed
3. **Registry Issues**: Check Windows permissions
4. **WebView2 Issues**: Ensure internet connection for runtime download

### Logs:

Installation logs are available in:

- Windows Event Viewer
- MSI log files (if verbose logging enabled)
- Tauri build output

## Security Considerations

The installer includes:

- Digital signature support (configure with your certificate)
- Registry permission checks
- File system permission validation
- UAC elevation when needed

## Maintenance

Regular maintenance should include:

- Updating version numbers
- Refreshing certificate if using code signing
- Testing on different Windows versions
- Validating upgrade scenarios

For more information about WiX and MSI configuration, refer to:

- WiX Toolset Documentation: https://wixtoolset.org/documentation/
- Microsoft MSI Documentation: https://docs.microsoft.com/en-us/windows/win32/msi/
