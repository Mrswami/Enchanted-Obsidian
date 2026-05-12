# 🛡️ SENTINEL QA // MISSION SPECIFICATION

## Overview
**Sentinel QA** is the high-integrity automated testing harness for the **Sovereign Nexus** ecosystem. It ensures that every sector of the dashboard remains operational, secure, and visually consistent.

## 🎯 Primary Objectives
1.  **Nexus Integrity**: Verify that the core dashboard loads and responds to user interaction.
2.  **Sector Verification**: Automatically "Warp" into each sector and verify the presence of critical manifests.
3.  **Portfolio Sync Protection**: Ensure the `projects.json` file remains valid and correctly reflects visibility toggles.
4.  **Visual Regression**: Prevent "UI Drift" across the cinematic, dark-themed dashboard.

## 🛠️ Technology Stack
-   **Core**: Playwright (Chromium)
-   **Language**: JavaScript (ESM)
-   **Integration**: Direct Tauri API testing (where applicable)

## 📡 Deployment Channels
-   **Local Sector**: Manual execution via `npm test`.
-   **Ironclad Pipeline**: Automated checks during GitHub Actions deployment.

## 📋 Current Test Suite
- [x] **Nexus Smoke Test**: Verify core UI elements and layout.
- [ ] **Warp Protocol Test**: Simulate sector warping.
- [ ] **Visibility Toggle Audit**: Verify projects.json updates.

---
**SENTINEL_QA v0.1.0 // INITIALIZED**
