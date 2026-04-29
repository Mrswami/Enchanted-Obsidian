$ws = New-Object -ComObject WScript.Shell
$targetPath = "C:\Users\freem\OneDrive\Desktop\TEZCAT Enchanted Obsidian.lnk"
$vbsPath = "C:\Users\freem\CursorAntiG\EnchantedObsidian\EnchantedVault.vbs"
$iconPath = "C:\Users\freem\CursorAntiG\EnchantedObsidian\src-tauri\icons\icon.ico"
$workDir = "C:\Users\freem\CursorAntiG\EnchantedObsidian"

$shortcut = $ws.CreateShortcut($targetPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.IconLocation = $iconPath
$shortcut.WorkingDirectory = $workDir
$shortcut.Save()

Write-Host "// 🛰️ CORRECTED LAUNCHER MANIFESTED ON DESKTOP"
