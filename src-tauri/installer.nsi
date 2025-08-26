Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "icons\icon.ico"
!define MUI_UNICON "icons\icon.ico"

; Installer pages
!define MUI_WELCOMEPAGE_TITLE "Welcome to UnlockIt Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of UnlockIt.$\r$\n$\r$\nIt is recommended that you close all other applications before starting Setup."
!insertmacro MUI_PAGE_WELCOME

!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY

; Custom page for shortcut options
Page custom ComponentsPageCreate ComponentsPageLeave

!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_TITLE "Completing UnlockIt Setup"
!define MUI_FINISHPAGE_TEXT "UnlockIt has been installed on your computer.$\r$\n$\r$\nClick Finish to close this wizard."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${MAINBINARYNAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch UnlockIt"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Variables for shortcut options
Var /GLOBAL CB_DESKTOP_SHORTCUT
Var /GLOBAL CB_START_MENU_SHORTCUT

; Custom page function
Function ComponentsPageCreate
  !insertmacro MUI_HEADER_TEXT "Choose Components" "Choose which additional tasks should be done."
  
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateLabel} 0 0 100% 12u "Additional shortcuts:"
  
  ${NSD_CreateCheckBox} 10 25u 100% 12u "Create a &desktop shortcut"
  Pop $CB_DESKTOP_SHORTCUT
  ${NSD_Check} $CB_DESKTOP_SHORTCUT ; Check by default
  
  ${NSD_CreateCheckBox} 10 45u 100% 12u "Create a &Start Menu shortcut"
  Pop $CB_START_MENU_SHORTCUT
  ${NSD_Check} $CB_START_MENU_SHORTCUT ; Check by default
  
  nsDialogs::Show
FunctionEnd

Function ComponentsPageLeave
FunctionEnd

Section "Install"
  ; Install files
  {{#each bundle_resources}}
    {{#if (eq this.src "../NOTICE")}}
        SetOutPath "$INSTDIR"
        File "{{this.src}}"
    {{else}}
        SetOutPath "$INSTDIR"
        File /r "{{this.src}}"
    {{/if}}
  {{/each}}
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Registry entries for Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "DisplayName" "${PRODUCTNAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "Publisher" "${MANUFACTURER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "DisplayIcon" "$INSTDIR\${MAINBINARYNAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}" "NoRepair" 1
  
  ; Create shortcuts based on user selection
  ${NSD_GetState} $CB_DESKTOP_SHORTCUT $0
  ${If} $0 == ${BST_CHECKED}
    CreateShortcut "$DESKTOP\UnlockIt.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
  ${EndIf}
  
  ${NSD_GetState} $CB_START_MENU_SHORTCUT $0
  ${If} $0 == ${BST_CHECKED}
    CreateDirectory "$SMPROGRAMS\UnlockIt"
    CreateShortcut "$SMPROGRAMS\UnlockIt\UnlockIt.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
    CreateShortcut "$SMPROGRAMS\UnlockIt\Uninstall UnlockIt.lnk" "$INSTDIR\uninstall.exe"
  ${EndIf}
  
SectionEnd

Section "Uninstall"
  ; Remove files
  {{#each bundle_resources}}
  Delete "$INSTDIR\{{this.target_path}}"
  {{/each}}
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\UnlockIt.lnk"
  RMDir /r "$SMPROGRAMS\UnlockIt"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BUNDLEID}"
SectionEnd
