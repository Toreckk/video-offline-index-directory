; v0.3.1 and earlier NSIS packages registered the dotted product name. Tauri's
; normal replacement check follows PRODUCTNAME, so the v0.3.2 rename needs one
; explicit bridge. This hook can be removed only after legacy upgrades are no
; longer supported.
!define LEGACY_VOID_PRODUCT_NAME "V.O.I.D."
!define LEGACY_VOID_UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${LEGACY_VOID_PRODUCT_NAME}"
!define LEGACY_VOID_PRODUCT_KEY "Software\toreckk\${LEGACY_VOID_PRODUCT_NAME}"

!macro NSIS_HOOK_PREINSTALL
  Push $R0
  Push $R1
  Push $R2

  ReadRegStr $R0 SHCTX "${LEGACY_VOID_UNINSTALL_KEY}" "UninstallString"
  ${If} $R0 != ""
    ReadRegStr $R1 SHCTX "${LEGACY_VOID_PRODUCT_KEY}" ""
    ${If} $R1 == ""
      MessageBox MB_ICONSTOP|MB_OK "VOID found a previous V.O.I.D. installation but could not locate it. Uninstall the previous version from Windows Settings, then run this installer again."
      SetErrorLevel 1
      Quit
    ${EndIf}

    DetailPrint "Removing the previous V.O.I.D. installation..."
    ClearErrors
    ; Passive mode skips the delete-app-data choice, while omitting /UPDATE lets
    ; the old uninstaller remove its dotted-name shortcuts and registration.
    ExecWait '$R0 /P _?=$R1' $R2
    ${If} ${Errors}
      MessageBox MB_ICONSTOP|MB_OK "VOID could not start the previous V.O.I.D. uninstaller. Close the app and try again."
      SetErrorLevel 1
      Quit
    ${ElseIf} $R2 <> 0
      MessageBox MB_ICONSTOP|MB_OK "VOID could not remove the previous V.O.I.D. installation (exit code $R2). The new installation has not continued."
      SetErrorLevel $R2
      Quit
    ${EndIf}

    ; A normal NSIS uninstall intentionally retains this location hint. It is
    ; obsolete after the product rename and contains no application data.
    DeleteRegKey SHCTX "${LEGACY_VOID_PRODUCT_KEY}"
    DeleteRegKey /ifempty SHCTX "Software\toreckk"
  ${EndIf}

  Pop $R2
  Pop $R1
  Pop $R0
!macroend
