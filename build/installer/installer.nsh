!include LogicLib.nsh
!include nsDialogs.nsh
!define NETRAFLOW_PRODUCT_NAME "NetraFlow"
!define NETRAFLOW_APP_ID "com.netraflow.app"
!define NETRAFLOW_INSTALL_DIR_NAME "NetraFlow"
!define NETRAFLOW_USERDATA_DIR_NAME "userdata"
!define NETRAFLOW_RUNTIME_DIR_NAME "runtime"
!define NETRAFLOW_DEMO_DIR_NAME ".demo"
!define NETRAFLOW_LOGS_DIR_NAME "logs"
!undef APP_FILENAME
!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"

!ifndef BUILD_UNINSTALLER
  !macro customInstallMode
    StrCpy $hasPerMachineInstallation "0"
    StrCpy $hasPerUserInstallation "1"
    !insertmacro setInstallModePerUser
    Call NetraFlowApplyDefaultInstallDir
    Abort
  !macroend

  !define MUI_PAGE_HEADER_TEXT "选定安装位置"
  !define MUI_PAGE_HEADER_SUBTEXT "选择 NetraFlow 的安装文件夹"
  !define MUI_DIRECTORYPAGE_TEXT_TOP "可使用默认位置，也可选择其他文件夹"
  !define MUI_DIRECTORYPAGE_TEXT_DESTINATION "目标文件夹"

  Function NetraFlowApplyDefaultInstallDir
    ${If} $INSTDIR != ""
      StrCpy $0 "$LOCALAPPDATA\Programs\${NETRAFLOW_INSTALL_DIR_NAME}"

      ${If} $INSTDIR != $0
        Return
      ${EndIf}
    ${EndIf}

    Call NetraFlowFindDefaultInstallDir
  FunctionEnd

  Function NetraFlowFindDefaultInstallDir
    ReadEnvStr $1 "SystemDrive"
    StrCpy $1 $1 1
    StrCpy $0 "DEFGHIJKLMNOPQRSTUVWXYZABC"

    ${For} $2 0 25
      StrCpy $3 $0 1 $2

      ${If} $3 != $1
        StrCpy $4 "$3:\"
        System::Call 'kernel32::GetDriveTypeW(w "$4") i .r5'

        ${If} $5 == 3
          StrCpy $INSTDIR "$4${NETRAFLOW_INSTALL_DIR_NAME}"
          Return
        ${EndIf}
      ${EndIf}
    ${Next}

    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${NETRAFLOW_INSTALL_DIR_NAME}"
  FunctionEnd
!else
  Var NetraFlowDeleteLocalUserData
  Var NetraFlowDeleteLocalUserDataCheckbox
!endif

!macro NetraFlowRemoveRuntimeEntries ROOT
  RMDir /r "${ROOT}\${NETRAFLOW_RUNTIME_DIR_NAME}"
  RMDir /r "${ROOT}\${NETRAFLOW_LOGS_DIR_NAME}"
  RMDir /r "${ROOT}\Local Storage"
  RMDir /r "${ROOT}\IndexedDB"
  RMDir /r "${ROOT}\Cache"
  RMDir /r "${ROOT}\Code Cache"
  RMDir /r "${ROOT}\GPUCache"
  RMDir /r "${ROOT}\Session Storage"
  RMDir /r "${ROOT}\blob_storage"
  RMDir /r "${ROOT}\DawnCache"
  RMDir /r "${ROOT}\DawnWebGPUCache"
  RMDir /r "${ROOT}\Network"
  RMDir /r "${ROOT}\Shared Dictionary"
  Delete "${ROOT}\Preferences"
  Delete "${ROOT}\Local State"
  RMDir "${ROOT}"
!macroend

!macro NetraFlowRemoveUserDataIfRequested ROOT
  ${If} $NetraFlowDeleteLocalUserData == "1"
    RMDir /r "${ROOT}\${NETRAFLOW_USERDATA_DIR_NAME}"
  ${EndIf}
!macroend

!macro NetraFlowRemoveLegacyProfileDirs
  !insertmacro NetraFlowRemoveRuntimeEntries $APPDATA\${NETRAFLOW_PRODUCT_NAME}
  !insertmacro NetraFlowRemoveRuntimeEntries $APPDATA\netraflow
  !insertmacro NetraFlowRemoveRuntimeEntries $LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}
  !insertmacro NetraFlowRemoveRuntimeEntries $LOCALAPPDATA\netraflow
  !insertmacro NetraFlowRemoveUserDataIfRequested $APPDATA\${NETRAFLOW_PRODUCT_NAME}
  !insertmacro NetraFlowRemoveUserDataIfRequested $APPDATA\netraflow
  !insertmacro NetraFlowRemoveUserDataIfRequested $LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}
  !insertmacro NetraFlowRemoveUserDataIfRequested $LOCALAPPDATA\netraflow
  RMDir "$APPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir "$APPDATA\netraflow"
  RMDir "$LOCALAPPDATA\${NETRAFLOW_PRODUCT_NAME}"
  RMDir "$LOCALAPPDATA\netraflow"
!macroend

!macro NetraFlowRemoveInstallDirIfAllowed
  ${If} $NetraFlowDeleteLocalUserData == "1"
    RMDir "$INSTDIR"
  ${ElseIfNot} ${FileExists} "$INSTDIR\${NETRAFLOW_USERDATA_DIR_NAME}\*.*"
    RMDir "$INSTDIR"
  ${EndIf}
!macroend

!macro NetraFlowCleanupRegistryRoots
  DeleteRegKey HKCU "Software\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\netraflow"
  DeleteRegKey HKCU "Software\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NETRAFLOW_APP_ID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "netraflow"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_PRODUCT_NAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "netraflow"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "${NETRAFLOW_APP_ID}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\AppSwitched" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FeatureUsage\ShowJumpView" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe.FriendlyAppName"
  DeleteRegValue HKCU "Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache" "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe.ApplicationCompany"
!macroend

!ifdef BUILD_UNINSTALLER
  Function un.NetraFlowRemoveInstallResidues
    SetShellVarContext current
    !insertmacro NetraFlowRemoveLegacyProfileDirs
    RMDir /r "$LOCALAPPDATA\netraflow-updater"
    RMDir /r "$TEMP\${NETRAFLOW_PRODUCT_NAME}"
    Delete "$DESKTOP\${NETRAFLOW_PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${NETRAFLOW_PRODUCT_NAME}.lnk"
    Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${NETRAFLOW_PRODUCT_NAME}.lnk"
    !ifdef APP_INSTALLER_STORE_FILE
      Delete "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"
    !endif
    !ifdef APP_PACKAGE_STORE_FILE
      Delete "$LOCALAPPDATA\${APP_PACKAGE_STORE_FILE}"
    !endif
  FunctionEnd

  Function un.NetraFlowScheduleNsisTempCleanup
    StrCpy $0 "$TEMP\~nsu.tmp"

    ${If} ${FileExists} "$0\*.*"
      Exec '"$SYSDIR\cmd.exe" /C ping 127.0.0.1 -n 3 >NUL & rmdir /S /Q "$0"'
    ${EndIf}
  FunctionEnd
!endif

!macro NetraFlowCleanupInstallRoots
  ${IfNot} ${isUpdated}
    Call un.NetraFlowRemoveInstallResidues
    !insertmacro NetraFlowRemoveRuntimeEntries $INSTDIR
    RMDir /r "$INSTDIR\${NETRAFLOW_DEMO_DIR_NAME}"

    ${If} $NetraFlowDeleteLocalUserData == "1"
      RMDir /r "$INSTDIR\${NETRAFLOW_USERDATA_DIR_NAME}"
    ${EndIf}

    !insertmacro NetraFlowRemoveInstallDirIfAllowed
  ${EndIf}
  !insertmacro NetraFlowCleanupRegistryRoots
!macroend

!ifndef BUILD_UNINSTALLER
  !macro customInit
    Call NetraFlowApplyDefaultInstallDir
  !macroend

  Function .onVerifyInstDir
    StrLen $3 $INSTDIR
    StrCpy $1 $INSTDIR 1 1

    ${If} $3 == 2
    ${AndIf} $1 == ":"
      StrCpy $0 $INSTDIR 1
      StrCpy $4 "$0:\"
      StrCpy $INSTDIR "$4${NETRAFLOW_INSTALL_DIR_NAME}"
      Return
    ${EndIf}

    StrCpy $2 $INSTDIR 1 2

    ${If} $3 == 3
    ${AndIf} $1 == ":"
    ${AndIf} $2 == "\"
      StrCpy $4 $INSTDIR 3
      StrCpy $INSTDIR "$4${NETRAFLOW_INSTALL_DIR_NAME}"
    ${EndIf}
  FunctionEnd

  !macro customInstall
    CreateDirectory "$INSTDIR\${NETRAFLOW_USERDATA_DIR_NAME}"
    CreateDirectory "$INSTDIR\${NETRAFLOW_RUNTIME_DIR_NAME}"
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

!ifdef BUILD_UNINSTALLER
  !macro customUnInit
    StrCpy $NetraFlowDeleteLocalUserData "1"
  !macroend

  !macro customUnWelcomePage
    UninstPage custom un.NetraFlowDeleteLocalUserDataPage un.NetraFlowDeleteLocalUserDataPageLeave
  !macroend

  Function un.NetraFlowDeleteLocalUserDataPage
    nsDialogs::Create 1018
    Pop $0

    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0u 0u 100% 14u "卸载选项"
    Pop $0

    ${NSD_CreateLabel} 0u 22u 100% 16u "选择是否同时删除 NetraFlow 的本地用户数据"
    Pop $0

    ${NSD_CreateLabel} 0u 44u 100% 16u "取消勾选将保留账户、历史记录和用户设置"
    Pop $0

    ${NSD_CreateCheckbox} 0u 76u 100% 14u "删除本地用户数据"
    Pop $NetraFlowDeleteLocalUserDataCheckbox

    ${If} $NetraFlowDeleteLocalUserData == "1"
      ${NSD_Check} $NetraFlowDeleteLocalUserDataCheckbox
    ${EndIf}

    nsDialogs::Show
  FunctionEnd

  Function un.NetraFlowDeleteLocalUserDataPageLeave
    ${NSD_GetState} $NetraFlowDeleteLocalUserDataCheckbox $0

    ${If} $0 == ${BST_CHECKED}
      StrCpy $NetraFlowDeleteLocalUserData "1"
    ${Else}
      StrCpy $NetraFlowDeleteLocalUserData "0"
    ${EndIf}
  FunctionEnd

  !macro customRemoveFiles
    SetOutPath $TEMP
    Delete "$INSTDIR\${NETRAFLOW_PRODUCT_NAME}.exe"
    Delete "$INSTDIR\chrome_100_percent.pak"
    Delete "$INSTDIR\chrome_200_percent.pak"
    Delete "$INSTDIR\d3dcompiler_47.dll"
    Delete "$INSTDIR\dxcompiler.dll"
    Delete "$INSTDIR\dxil.dll"
    Delete "$INSTDIR\ffmpeg.dll"
    Delete "$INSTDIR\icudtl.dat"
    Delete "$INSTDIR\libEGL.dll"
    Delete "$INSTDIR\libGLESv2.dll"
    Delete "$INSTDIR\LICENSE"
    Delete "$INSTDIR\LICENSE.electron.txt"
    Delete "$INSTDIR\LICENSES.chromium.html"
    Delete "$INSTDIR\resources.pak"
    Delete "$INSTDIR\snapshot_blob.bin"
    Delete "$INSTDIR\v8_context_snapshot.bin"
    Delete "$INSTDIR\version"
    Delete "$INSTDIR\vk_swiftshader.dll"
    Delete "$INSTDIR\vk_swiftshader_icd.json"
    Delete "$INSTDIR\vulkan-1.dll"
    Delete "$INSTDIR\installer.exe"
    Delete "$INSTDIR\installerIcon.ico"
    Delete "$INSTDIR\uninstallerIcon.ico"
    Delete "$INSTDIR\${UNINSTALL_FILENAME}"
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\locales"
    RMDir /r "$INSTDIR\licenses"
    !insertmacro NetraFlowRemoveRuntimeEntries $INSTDIR
    RMDir /r "$INSTDIR\${NETRAFLOW_DEMO_DIR_NAME}"
    !insertmacro NetraFlowRemoveLegacyProfileDirs

    ${If} $NetraFlowDeleteLocalUserData == "1"
      RMDir /r "$INSTDIR\${NETRAFLOW_USERDATA_DIR_NAME}"
    ${EndIf}

    !insertmacro NetraFlowRemoveInstallDirIfAllowed
  !macroend

  Function un.onUninstSuccess
    !insertmacro NetraFlowRemoveRuntimeEntries $INSTDIR
    RMDir /r "$INSTDIR\${NETRAFLOW_DEMO_DIR_NAME}"
    !insertmacro NetraFlowRemoveLegacyProfileDirs
    !insertmacro NetraFlowRemoveInstallDirIfAllowed
    Call un.NetraFlowScheduleNsisTempCleanup
  FunctionEnd
!endif

!macro customUnInstall
  !insertmacro NetraFlowCleanupInstallRoots
!macroend
