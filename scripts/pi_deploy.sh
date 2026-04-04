#!/bin/bash
# 🌌 Enchanted Obsidian: Sovereign Pi 5 Deployment
# This script initializes the environment and creates a systemd service for the Ingester Bot.

PROJECT_DIR=$(pwd)
SERVICE_NAME="enchanted-brain"
USER_NAME=$(whoami)

echo "// 🛰️ INITIATING SOVEREIGN NODE DEPLOYMENT..."

# 1. Update & Install Dependencies
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip libgbm1 libasound2 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 libcairo2 libasound2

# 2. Setup Virtual Environment
if [ ! -d "venv" ]; then
    echo "// ⚙️ CREATING VIRTUAL ENVIRONMENT..."
    python3 -m venv venv
fi

# 3. Install Python Dependencies
echo "// 📦 INSTALLING ENCHANTED MODULES..."
./venv/bin/pip install --upgrade pip
./venv/bin/pip install discord.py python-dotenv playwright beautifulsoup4 google-generativeai

# 4. Install Playwright Browsers (Headless Chromium)
echo "// 👁️ INSTALLING HEADLESS CHROME..."
./venv/bin/playwright install chromium
./venv/bin/playwright install-deps chromium

# 5. Create Systemd Service File
echo "// 🛡️ REGISTERING SOVEREIGN SERVICE..."
sudo bash -c "cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Enchanted Obsidian: Sovereign Ingestion Bot
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=${PROJECT_DIR}/.env
ExecStart=${PROJECT_DIR}/venv/bin/python ${PROJECT_DIR}/scripts/link_ingester_bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF"

# 6. Enable & Start Service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}

echo "----------------------------------------------------"
echo "// ✅ DEPLOYMENT COMPLETE"
echo "// STAT: systemctl status ${SERVICE_NAME}"
echo "// LOGS: journalctl -u ${SERVICE_NAME} -f"
echo "----------------------------------------------------"
