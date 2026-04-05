Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
' Get the path to this script's folder
strBaseDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strBaseDir & "\scripts\EnchantedLauncher.bat"

' Run the engine batch file in hidden mode (0)
If fso.FileExists(strBatPath) Then
    WshShell.Run chr(34) & strBatPath & chr(34), 0, False
Else
    MsgBox "CRITICAL ERROR: Sovereign Engine Not Found at " & strBatPath
End If

Set WshShell = Nothing
Set fso = Nothing
