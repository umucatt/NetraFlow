!include LogicLib.nsh
!define NETRAFLOW_PRODUCT_NAME "NetraFlow"
!define NETRAFLOW_APP_ID "com.netraflow.app"
!define NETRAFLOW_INSTALL_DIR_NAME "NetraFlow"
!undef APP_FILENAME
!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"

!ifndef BUILD_UNINSTALLER
  Var NetraFlowWindowsDir
  Var NetraFlowSystemDrive
  Var NetraFlowPreferredDrive
  Var NetraFlowDriveLetter
  Var NetraFlowDriveLetters
  Var NetraFlowDriveIndex
  Var NetraFlowSelectedDir
  Var NetraFlowSelectedTail

  Function NetraFlowFindDefaultInstallDir
    ReadEnvStr $NetraFlowWindowsDir "WINDIR"
    StrCpy $NetraFlowSystemDrive $NetraFlowWindowsDir 1
    StrCpy $NetraFlowPreferredDrive ""
    StrCpy $NetraFlowDriveLetters "DEFGHIJKLMNOPQRSTUVWXYZ"
    StrCpy $NetraFlowDriveIndex 0

    ${Do}
      StrCpy $NetraFlowDriveLetter $NetraFlowDriveLetters 1 $NetraFlowDriveIndex

      ${If} $NetraFlowDriveLetter == ""
        ${Break}
      ${EndIf}

      System::Call 'kernel32::GetDriveType(t "$NetraFlowDriveLetter:\") i .r0'

      ${If} $0 == 3
      ${AndIf} $NetraFlowDriveLetter != $NetraFlowSystemDrive
        StrCpy $NetraFlowPreferredDrive $NetraFlowDriveLetter
        ${Break}
      ${EndIf}

      IntOp $NetraFlowDriveIndex $NetraFlowDriveIndex + 1
    ${Loop}

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

    StrCpy $NetraFlowSelectedTail $NetraFlowSelectedDir "" -1

    ${If} $NetraFlowSelectedTail == "\"
      StrCpy $NetraFlowSelectedDir $NetraFlowSelectedDir -1
    ${EndIf}

    StrCpy $NetraFlowSelectedTail $NetraFlowSelectedDir 10 -10

    ${If} $NetraFlowSelectedTail == "\${NETRAFLOW_INSTALL_DIR_NAME}"
      StrCpy $INSTDIR "$NetraFlowSelectedDir"
    ${Else}
      StrCpy $INSTDIR "$NetraFlowSelectedDir\${NETRAFLOW_INSTALL_DIR_NAME}"
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

  Function .onVerifyInstDir
    Call NetraFlowNormalizeInstallDir
  FunctionEnd
!else
  Var NetraFlowUsersRoot
  Var NetraFlowUserSearchHandle
  Var NetraFlowUserEntry
  Var NetraFlowUserPath
!endif

!macro NetraFlowRemoveUserRuntimeData USER_ROOT
  RMDir /r "${USER_ROOT}\AppData\Roaming\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "${USER_ROOT}\AppData\Roaming\netraflow"
  RMDir /r "${USER_ROOT}\AppData\Local\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "${USER_ROOT}\AppData\Local\netraflow"
  RMDir /r "${USER_ROOT}\AppData\Local\netraflow-updater"
  RMDir /r "${USER_ROOT}\AppData\Local\Programs\${NETRAFLOW_PRODUCT_NAME}"
  Delete "${USER_ROOT}\Desktop\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "${USER_ROOT}\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "${USER_ROOT}\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
!macroend

!macro NetraFlowCleanupRegistryRoots
  DeleteRegKey HKCU "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\netraflow"
  DeleteRegKey HKLM "Software\netraflow"
  DeleteRegKey HKCU "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\${APP_GUID}"
  DeleteRegKey HKLM "Software\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "netraflow"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "netraflow"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "netraflow"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "netraflow"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\AppSwitched" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\ShowJumpView" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe.FriendlyAppName"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe.ApplicationCompany"
!macroend

!ifdef BUILD_UNINSTALLER
  Function un.NetraFlowRemoveKnownUserDataDirs
    SetShellVarContext current
    RMDir /r "$APPDATA\${NETRAFLOW_PRODUCT_NAME}"
    RMDir /r "$APPDATA\netraflow"
    RMDir /r "$LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}"
    RMDir /r "$LOCALAPPDATA\netraflow"
    RMDir /r "$LOCALAPPDATA\netraflow-updater"
    RMDir /r "$LOCALAPPDATA\Programs\${NETRAFLOW_PRODUCT_NAME}"
    Delete "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}.lnk"
    Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
    SetShellVarContext all

    ReadEnvStr $NetraFlowUsersRoot "SystemDrive"

    ${If} $NetraFlowUsersRoot == ""
      StrCpy $NetraFlowUsersRoot "C:"
    ${EndIf}

    StrCpy $NetraFlowUsersRoot "$NetraFlowUsersRoot\Users"

    IfFileExists "$NetraFlowUsersRoot\*.*" 0 done
    ClearErrors
    FindFirst $NetraFlowUserSearchHandle $NetraFlowUserEntry "$NetraFlowUsersRoot\*"

    ${If} ${Errors}
      Goto done
    ${EndIf}

    ${Do}
      ${If} $NetraFlowUserEntry != "."
      ${AndIf} $NetraFlowUserEntry != ".."
        StrCpy $NetraFlowUserPath "$NetraFlowUsersRoot\$NetraFlowUserEntry"

        IfFileExists "$NetraFlowUserPath\*.*" 0 next
        !insertmacro NetraFlowRemoveUserRuntimeData "$NetraFlowUserPath"
      ${EndIf}

      next:
      ClearErrors
      FindNext $NetraFlowUserSearchHandle $NetraFlowUserEntry

      ${If} ${Errors}
        ${Break}
      ${EndIf}
    ${Loop}

    FindClose $NetraFlowUserSearchHandle

    done:
  FunctionEnd
!endif

!macro NetraFlowCleanupInstallRoots
  Call un.NetraFlowRemoveKnownUserDataDirs
  RMDir /r "$APPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$APPDATA\netraflow"
  RMDir /r "$LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir /r "$LOCALAPPDATA\netraflow"
  RMDir /r "$INSTDIR\userData"
  RMDir /r "$LOCALAPPDATA\netraflow-updater"
  RMDir /r "$LOCALAPPDATA\Programs\${NETRAFLOW_PRODUCT_NAME}"
  Delete "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}.lnk"
  Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
  SetRegView 64
  !insertmacro NetraFlowCleanupRegistryRoots
  SetRegView 32
  !insertmacro NetraFlowCleanupRegistryRoots
  SetRegView lastused
  RMDir /r "$INSTDIR"
!macroend

!ifndef BUILD_UNINSTALLER
  !macro customInit
    Call NetraFlowApplyDefaultInstallDir
  !macroend

  !macro customFinishPage
    Function NetraFlowLaunchAfterFinish
      ${StdUtils.ExecShellAsUser} $0 "$appExe" "open" ""
    FunctionEnd

    Function NetraFlowCreateDesktopShortcutAfterFinish
      SetShellVarContext current
      CreateShortCut "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk" "${NETRAFLOW_APP_ID}"
      SetShellVarContext all
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_TEXT "运行 ${NETRAFLOW_PRODUCT_NAME}"
    !define MUI_FINISHPAGE_RUN_FUNCTION "NetraFlowLaunchAfterFinish"
    !define MUI_FINISHPAGE_RUN_NOTCHECKED
    !define MUI_FINISHPAGE_SHOWREADME
    !define MUI_FINISHPAGE_SHOWREADME_TEXT "创建桌面快捷方式"
    !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "NetraFlowCreateDesktopShortcutAfterFinish"
    !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
    !insertmacro MUI_PAGE_FINISH
  !macroend
!endif

!macro customUnInstall
  !insertmacro NetraFlowCleanupInstallRoots
!macroend
