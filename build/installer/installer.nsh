!define NETRAFLOW_PRODUCT_NAME "NetraFlow"
!define NETRAFLOW_APP_ID "netraflow"
!define NETRAFLOW_INSTALL_DIR_NAME "NertaFlow"
!undef APP_FILENAME
!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE NetraFlowInstallModeLeave

Var NetraFlowWindowsDir
Var NetraFlowSystemDrive
Var NetraFlowPreferredDrive
Var NetraFlowDriveLetter
Var NetraFlowSelectedDir

Function NetraFlowFindDefaultInstallDir
  ReadEnvStr $NetraFlowWindowsDir "WINDIR"
  StrCpy $NetraFlowSystemDrive $NetraFlowWindowsDir 1
  StrCpy $NetraFlowPreferredDrive ""
  System::Call 'kernel32::GetLogicalDrives() i .r9'
  StrCpy $NetraFlowDriveLetter "D"
  System::Call 'kernel32::GetDriveType(t "$NetraFlowDriveLetter:\") i .r0'

  ${If} $0 == 3
  ${AndIf} $NetraFlowDriveLetter != $NetraFlowSystemDrive
    StrCpy $NetraFlowPreferredDrive $NetraFlowDriveLetter
  ${EndIf}

  ${If} $NetraFlowPreferredDrive == ""
    StrCpy $NetraFlowPreferredDrive $NetraFlowSystemDrive
  ${EndIf}

  StrCpy $INSTDIR "$NetraFlowPreferredDrive:\${NETRAFLOW_INSTALL_DIR_NAME}"
FunctionEnd

Function NetraFlowNormalizeInstallDir
  StrCpy $NetraFlowSelectedDir $INSTDIR

  ${If} $NetraFlowSelectedDir == ""
    Call NetraFlowFindDefaultInstallDir
    Return
  ${EndIf}

  ${If} $NetraFlowSelectedDir == "\NertaFlow\NetraFlow"
    StrCpy $NetraFlowSelectedDir "$NetraFlowSelectedDir" -10
  ${EndIf}

  ${If} $NetraFlowSelectedDir == "\NertaFlow\NertaFlow"
    StrCpy $INSTDIR "$NetraFlowSelectedDir" -9
  ${EndIf}

  ${If} $NetraFlowSelectedDir == "$NetraFlowPreferredDrive:\"
    StrCpy $INSTDIR "$INSTDIR${NETRAFLOW_INSTALL_DIR_NAME}"
  ${ElseIf} $NetraFlowSelectedDir == "$NetraFlowPreferredDrive:"
    StrCpy $INSTDIR "$NetraFlowSelectedDir\${NETRAFLOW_INSTALL_DIR_NAME}"
  ${Else}
    StrCpy $INSTDIR "$NetraFlowSelectedDir${NETRAFLOW_INSTALL_DIR_NAME}"
  ${EndIf}
FunctionEnd

Function NetraFlowApplyDefaultInstallDir
  StrCpy $0 "$CMDLINE"

  ${Do}
    StrCpy $4 $0 3
    ${If} $4 == "/D="
      Return
    ${EndIf}

    ${If} $0 == ""
      ${Break}
    ${EndIf}

    StrCpy $0 $0 "" 1
  ${Loop}

  Call NetraFlowFindDefaultInstallDir
FunctionEnd

Function NetraFlowInstallModeLeave
  Call NetraFlowNormalizeInstallDir
FunctionEnd

Function .onVerifyInstDir
  Call NetraFlowNormalizeInstallDir
FunctionEnd

!macro NetraFlowRemoveKnownInstallContents TARGET_DIR
  Delete "${TARGET_DIR}\uninstallerIcon.ico"
  Delete "${TARGET_DIR}\installerIcon.ico"
  Delete "${TARGET_DIR}\netraflow.ico"
  Delete "${TARGET_DIR}\NetraFlow.ico"
  RMDir "${TARGET_DIR}\${NETRAFLOW_PRODUCT_NAME}"
  RMDir "${TARGET_DIR}\${NETRAFLOW_INSTALL_DIR_NAME}"
!macroend

!macro NetraFlowCleanupInstallRoots
  RMDir /r "$APPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$INSTDIR\userData"
  Delete "$LOCALAPPDATA\netraflow-updater\installer.exe"
  RMDir /r "$LOCALAPPDATA\netraflow-updater"
  Delete "$INSTDIR\uninstallerIcon.ico"
  Delete "$INSTDIR\installerIcon.ico"
  Delete "$INSTDIR\netraflow.ico"
  Delete "$INSTDIR\NetraFlow.ico"
  !insertmacro NetraFlowRemoveKnownInstallContents "$R0"
  !insertmacro NetraFlowRemoveKnownInstallContents "$R0\NetraFlow"
  !insertmacro NetraFlowRemoveKnownInstallContents "$R0\NertaFlow"
  RMDir "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}"
  RMDir "$INSTDIR\${NETRAFLOW_INSTALL_DIR_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_APP_ID}"
  Delete "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
  StrCpy $R3 "$INSTDIR"
  ${If} $R3 == "\NetraFlow"
  ${OrIf} $R3 == "\NertaFlow"
    RMDir "$R0"
  ${EndIf}
!macroend

!macro preInit
  Call NetraFlowApplyDefaultInstallDir
!macroend

!macro customUnInstall
  !insertmacro NetraFlowCleanupInstallRoots
!macroend
