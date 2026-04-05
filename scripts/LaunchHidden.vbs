Set WshShell = CreateObject("WScript.Shell")
' Launch the batch file in hidden mode (0)
WshShell.Run chr(34) & "C:\Users\freem\CursorAntiG\EnchantedObsidian\scripts\EnchantedLauncher.bat" & chr(34), 0
Set WshShell = Nothing
