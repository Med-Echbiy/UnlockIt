; UnlockIt NSIS Installer Hooks - Ultimate Achievement Tracker
; Custom installation experience for gamers

!macro NSIS_HOOK_POSTINSTALL
    ; Create desktop shortcut with gaming icon
    CreateShortcut "$DESKTOP\UnlockIt.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0 SW_SHOWNORMAL "" "UnlockIt - Ultimate Achievement Tracker for Gamers"
    
    ; Create Start Menu folder and shortcuts
    CreateDirectory "$SMPROGRAMS\UnlockIt"
    CreateShortcut "$SMPROGRAMS\UnlockIt\UnlockIt.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0 SW_SHOWNORMAL "" "UnlockIt - Ultimate Achievement Tracker"
    CreateShortcut "$SMPROGRAMS\UnlockIt\Uninstall UnlockIt.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0 SW_SHOWNORMAL "" "Uninstall UnlockIt"
    
    ; Add enhanced registry entries for gaming application
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "Comments" "Ultimate Achievement Tracker - Monitor gaming progress across all your favorite games"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "HelpLink" "https://github.com/Med-Echbiy/UnlockIt"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "URLInfoAbout" "https://github.com/Med-Echbiy/UnlockIt"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "Contact" "Mohamed Echbiy"
    
    ; Create file association for achievement files (if you want)
    WriteRegStr HKCR ".unlock" "" "UnlockIt.AchievementFile"
    WriteRegStr HKCR "UnlockIt.AchievementFile" "" "UnlockIt Achievement File"
    WriteRegStr HKCR "UnlockIt.AchievementFile\DefaultIcon" "" "$INSTDIR\${MAINBINARYNAME}.exe,0"
    WriteRegStr HKCR "UnlockIt.AchievementFile\shell\open\command" "" '"$INSTDIR\${MAINBINARYNAME}.exe" "%1"'
    
    ; Gaming-focused completion message
    MessageBox MB_OK|MB_ICONINFORMATION "🎮 UnlockIt - Ultimate Achievement Tracker$\r$\n$\r$\n✅ Installation Complete!$\r$\n$\r$\n🖥️ Desktop shortcut created$\r$\n📁 Start Menu shortcuts added$\r$\n🎯 Ready to track your gaming achievements!$\r$\n$\r$\nStart your gaming journey and never miss an achievement again!"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
    ; Remove desktop shortcut
    Delete "$DESKTOP\UnlockIt.lnk"
    
    ; Remove Start Menu shortcuts and folder
    Delete "$SMPROGRAMS\UnlockIt\UnlockIt.lnk"
    Delete "$SMPROGRAMS\UnlockIt\Uninstall UnlockIt.lnk"
    RMDir "$SMPROGRAMS\UnlockIt"
    
    ; Remove file associations
    DeleteRegKey HKCR ".unlock"
    DeleteRegKey HKCR "UnlockIt.AchievementFile"
    
    ; Gaming-themed goodbye message
    MessageBox MB_OK|MB_ICONINFORMATION "🎮 UnlockIt Uninstalled$\r$\n$\r$\nYour gaming achievements data is preserved.$\r$\n$\r$\nThanks for using UnlockIt - Ultimate Achievement Tracker!$\r$\n$\r$\nKeep gaming and achieving! 🏆"
!macroend
