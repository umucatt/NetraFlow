!include LogicLib.nsh

!define NETRAFLOW_PRODUCT_NAME "NetraFlow"
!define NETRAFLOW_INSTALL_DIR_NAME "NertaFlow"
!define NETRAFLOW_APP_ID "com.netraflow.app"

!ifndef BUILD_UNINSTALLER
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE NetraFlowInstallModeLeave
!endif

!ifdef APP_FILENAME
  !undef APP_FILENAME
!endif
!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"

Var NetraFlowSystemDrive
Var NetraFlowDriveMask
Var NetraFlowDriveIndex
Var NetraFlowDriveBit
Var NetraFlowDriveLetter
Var NetraFlowDrivePath
Var NetraFlowPreferredDrive
Var NetraFlowWindowsDir
Var NetraFlowSelectedDir
Var NetraFlowSelectedDirLength
Var NetraFlowSelectedDirTail
Var NetraFlowSelectedDirDriveMark
Var NetraFlowSelectedDirSuffix

Function NetraFlowFindDefaultInstallDir
  ReadEnvStr $NetraFlowWindowsDir "WINDIR"
  StrCpy $NetraFlowSystemDrive "$NetraFlowWindowsDir" 1

  ${If} $NetraFlowSystemDrive == ""
    ReadEnvStr $NetraFlowSystemDrive "SystemDrive"
  ${EndIf}

  StrCpy $NetraFlowSystemDrive "$NetraFlowSystemDrive" 1
  StrCpy $NetraFlowPreferredDrive ""
  System::Call 'kernel32::GetLogicalDrives() i .r0'
  StrCpy $NetraFlowDriveMask $0

  ${For} $NetraFlowDriveIndex 0 25
    IntOp $NetraFlowDriveBit 1 << $NetraFlowDriveIndex
    IntOp $NetraFlowDriveBit $NetraFlowDriveBit & $NetraFlowDriveMask

    ${If} $NetraFlowDriveBit != 0
      IntOp $0 $NetraFlowDriveIndex + 65
      IntFmt $NetraFlowDriveLetter "%c" $0
      StrCpy $NetraFlowDrivePath "$NetraFlowDriveLetter:\"
      System::Call 'kernel32::GetDriveType(t "$NetraFlowDrivePath") i .r0'

      ${If} $0 == 3
      ${AndIf} $NetraFlowDriveLetter != $NetraFlowSystemDrive
        StrCpy $NetraFlowPreferredDrive $NetraFlowDriveLetter
        ${Break}
      ${EndIf}
    ${EndIf}
  ${Next}

  ${If} $NetraFlowPreferredDrive == ""
    ${If} $NetraFlowSystemDrive != ""
      StrCpy $NetraFlowPreferredDrive $NetraFlowSystemDrive
    ${Else}
      StrCpy $NetraFlowPreferredDrive "C"
    ${EndIf}
  ${EndIf}

  StrCpy $INSTDIR "$NetraFlowPreferredDrive:\${NETRAFLOW_INSTALL_DIR_NAME}"
FunctionEnd

Function NetraFlowNormalizeInstallDir
  StrCpy $NetraFlowSelectedDir "$INSTDIR"

  ${Do}
    StrLen $NetraFlowSelectedDirLength "$NetraFlowSelectedDir"

    ${If} $NetraFlowSelectedDirLength <= 3
      ${ExitDo}
    ${EndIf}

    StrCpy $NetraFlowSelectedDirTail "$NetraFlowSelectedDir" 1 -1

    ${If} $NetraFlowSelectedDirTail != "\"
      ${ExitDo}
    ${EndIf}

    StrCpy $NetraFlowSelectedDir "$NetraFlowSelectedDir" -1
  ${Loop}

  ${If} $NetraFlowSelectedDirLength == 0
    Return
  ${EndIf}

  StrCpy $NetraFlowSelectedDirSuffix "$NetraFlowSelectedDir" 20 -20

  ${If} $NetraFlowSelectedDirSuffix == "\NertaFlow\NetraFlow"
  ${OrIf} $NetraFlowSelectedDirSuffix == "\NertaFlow\NertaFlow"
  ${OrIf} $NetraFlowSelectedDirSuffix == "\NetraFlow\NetraFlow"
  ${OrIf} $NetraFlowSelectedDirSuffix == "\NetraFlow\NertaFlow"
    StrCpy $NetraFlowSelectedDir "$NetraFlowSelectedDir" -10
  ${EndIf}

  StrLen $NetraFlowSelectedDirLength "$NetraFlowSelectedDir"

  ${If} $NetraFlowSelectedDirLength == 2
    StrCpy $NetraFlowSelectedDirDriveMark "$NetraFlowSelectedDir" 1 1

    ${If} $NetraFlowSelectedDirDriveMark == ":"
      StrCpy $INSTDIR "$NetraFlowSelectedDir\${NETRAFLOW_INSTALL_DIR_NAME}"
    ${EndIf}
  ${ElseIf} $NetraFlowSelectedDirLength == 3
    StrCpy $NetraFlowSelectedDirDriveMark "$NetraFlowSelectedDir" 1 1
    StrCpy $NetraFlowSelectedDirTail "$NetraFlowSelectedDir" 1 2

    ${If} $NetraFlowSelectedDirDriveMark == ":"
    ${AndIf} $NetraFlowSelectedDirTail == "\"
      StrCpy $INSTDIR "$NetraFlowSelectedDir${NETRAFLOW_INSTALL_DIR_NAME}"
    ${EndIf}
  ${Else}
    StrCpy $NetraFlowSelectedDirSuffix "$NetraFlowSelectedDir" 10 -10

    ${If} $NetraFlowSelectedDirSuffix == "\NertaFlow"
      StrCpy $INSTDIR "$NetraFlowSelectedDir"
    ${ElseIf} $NetraFlowSelectedDirSuffix == "\NetraFlow"
      StrCpy $INSTDIR "$NetraFlowSelectedDir" -9
      StrCpy $INSTDIR "$INSTDIR${NETRAFLOW_INSTALL_DIR_NAME}"
    ${Else}
      StrCpy $INSTDIR "$NetraFlowSelectedDir\${NETRAFLOW_INSTALL_DIR_NAME}"
    ${EndIf}
  ${EndIf}
FunctionEnd

Function .onVerifyInstDir
  Call NetraFlowNormalizeInstallDir
FunctionEnd

!ifndef BUILD_UNINSTALLER
  Function NetraFlowApplyDefaultInstallDir
    StrCpy $0 "$CMDLINE"
    StrCpy $1 ""
    StrLen $2 $0
    IntOp $2 $2 - 2
    StrCpy $3 0

    ${Do}
      StrCpy $4 $0 3 $3

      ${If} $4 == "/D="
      ${OrIf} $4 == "/d="
        IntOp $3 $3 + 3
        StrCpy $1 $0 "" $3
        ${Break}
      ${EndIf}

      IntOp $3 $3 + 1
    ${LoopUntil} $3 > $2

    ${If} $1 == ""
      Call NetraFlowFindDefaultInstallDir
    ${EndIf}

    Call NetraFlowNormalizeInstallDir
  FunctionEnd

  Function NetraFlowInstallModeLeave
    Call NetraFlowApplyDefaultInstallDir
  FunctionEnd
!endif

!macro NetraFlowRemoveKnownInstallContents TARGET_DIR
  Delete "${TARGET_DIR}\NetraFlow.exe"
  Delete "${TARGET_DIR}\Uninstall NetraFlow.exe"
  Delete "${TARGET_DIR}\uninstallerIcon.ico"
  Delete "${TARGET_DIR}\installerIcon.ico"
  Delete "${TARGET_DIR}\netraflow.ico"
  Delete "${TARGET_DIR}\NetraFlow.ico"
  Delete "${TARGET_DIR}\chrome_100_percent.pak"
  Delete "${TARGET_DIR}\chrome_200_percent.pak"
  Delete "${TARGET_DIR}\d3dcompiler_47.dll"
  Delete "${TARGET_DIR}\dxcompiler.dll"
  Delete "${TARGET_DIR}\dxil.dll"
  Delete "${TARGET_DIR}\ffmpeg.dll"
  Delete "${TARGET_DIR}\icudtl.dat"
  Delete "${TARGET_DIR}\libEGL.dll"
  Delete "${TARGET_DIR}\libGLESv2.dll"
  Delete "${TARGET_DIR}\LICENSE.electron.txt"
  Delete "${TARGET_DIR}\LICENSES.chromium.html"
  Delete "${TARGET_DIR}\resources.pak"
  Delete "${TARGET_DIR}\snapshot_blob.bin"
  Delete "${TARGET_DIR}\v8_context_snapshot.bin"
  Delete "${TARGET_DIR}\vk_swiftshader.dll"
  Delete "${TARGET_DIR}\vk_swiftshader_icd.json"
  Delete "${TARGET_DIR}\vulkan-1.dll"
  RMDir /r "${TARGET_DIR}\licenses"
  RMDir /r "${TARGET_DIR}\locales"
  RMDir /r "${TARGET_DIR}\resources"
  SetOutPath "$TEMP"
  RMDir "${TARGET_DIR}"
!macroend

!macro preInit
  Call NetraFlowFindDefaultInstallDir
!macroend

!macro customInit
  Call NetraFlowApplyDefaultInstallDir
!macroend

!macro customInstall
  !ifdef APP_INSTALLER_STORE_FILE
    Delete "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
  !endif
  Delete "$LOCALAPPDATA\netraflow-updater\installer.exe"
  RMDir /r "$LOCALAPPDATA\netraflow-updater"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$APPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$APPDATA\${NETRAFLOW_INSTALL_DIR_NAME}"
  RMDir /r "$LOCALAPPDATA\${NETRAFLOW_INSTALL_DIR_NAME}"
  Delete "$LOCALAPPDATA\netraflow-updater\installer.exe"
  RMDir /r "$LOCALAPPDATA\netraflow-updater"
  RMDir /r "$INSTDIR\userData"
  Delete "$INSTDIR\uninstallerIcon.ico"
  Delete "$INSTDIR\installerIcon.ico"
  Delete "$INSTDIR\netraflow.ico"
  Delete "$INSTDIR\NetraFlow.ico"
  RMDir "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}"
  RMDir "$INSTDIR\${NETRAFLOW_INSTALL_DIR_NAME}"
  RMDir "$INSTDIR"
  SetRegView 64
  DeleteRegKey HKCU "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_INSTALL_DIR_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_INSTALL_DIR_NAME}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  SetRegView 32
  DeleteRegKey HKCU "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_INSTALL_DIR_NAME}"
  DeleteRegKey HKCU "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_INSTALL_DIR_NAME}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  !ifdef INSTALL_REGISTRY_KEY
    DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
    DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
  !endif
!macroend

!macro customRemoveFiles
  Push $R0
  Push $R1
  Push $R2
  Push $R3
  Push $R4
  Push $R5
  StrCpy $R0 "$INSTDIR"
  StrCpy $R5 ""

  ${Do}
    StrLen $R1 "$R0"

    ${If} $R1 <= 3
      ${ExitDo}
    ${EndIf}

    StrCpy $R2 "$R0" 1 -1

    ${If} $R2 != "\"
      ${ExitDo}
    ${EndIf}

    StrCpy $R0 "$R0" -1
  ${Loop}

  StrCpy $R3 "$R0" 10 -10
  StrCpy $R4 ""

  StrCpy $R2 "$R0" 20 -20

  ${If} $R2 == "\NertaFlow\NetraFlow"
  ${OrIf} $R2 == "\NertaFlow\NertaFlow"
  ${OrIf} $R2 == "\NetraFlow\NetraFlow"
  ${OrIf} $R2 == "\NetraFlow\NertaFlow"
    StrCpy $R4 "$R0" -10
  ${EndIf}

  ${If} $R3 == "\NetraFlow"
  ${OrIf} $R3 == "\NertaFlow"
    ${If} ${FileExists} "$R0\NetraFlow\*.*"
      !insertmacro NetraFlowRemoveKnownInstallContents "$R0\NetraFlow"
      StrCpy $R5 "parentOnly"
    ${EndIf}

    ${If} ${FileExists} "$R0\NertaFlow\*.*"
      !insertmacro NetraFlowRemoveKnownInstallContents "$R0\NertaFlow"
      StrCpy $R5 "parentOnly"
    ${EndIf}

    ${If} $R5 == "parentOnly"
      RMDir "$R0"
    ${Else}
      !insertmacro NetraFlowRemoveKnownInstallContents "$R0"
    ${EndIf}
  ${Else}
    RMDir "$R0"
  ${EndIf}

  ${If} $R4 != ""
    StrCpy $R3 "$R4" 10 -10

    ${If} $R3 == "\NetraFlow"
    ${OrIf} $R3 == "\NertaFlow"
      RMDir "$R4"
    ${EndIf}
  ${EndIf}
  Pop $R5
  Pop $R4
  Pop $R3
  Pop $R2
  Pop $R1
  Pop $R0
!macroend
