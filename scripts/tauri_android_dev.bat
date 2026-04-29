@echo off
TITLE Enchanted Obsidian: Sovereign Android Dev
:: Set local paths for Cargo and Node
set PATH=%PATH%;C:\Program Files\nodejs;C:\Users\freem\.cargo\bin

echo // [PROCESSING] MANIFESTING ANDROID DEV ENVIRONMENT...
:: Target aarch64 for physical Android devices (faster than emulator)
:: We use --no-before-dev-command if the dev server is already running manually
npx tauri android dev --target aarch64-linux-android
