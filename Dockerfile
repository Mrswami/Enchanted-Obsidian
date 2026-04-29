# Use a Playwright-ready image to handle scraping
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Set work directory
WORKDIR /app

# Copy requirements and install
COPY scripts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Manually add google-generativeai as it was missing from requirements
RUN pip install --no-cache-dir "google-generativeai>=0.8.0"

# Install Playwright browsers (already in the base image, but ensures deps are met)
RUN playwright install chromium

# Copy the bot script
COPY scripts/link_ingester_bot.py .

# The bot will expect .env to be provided at runtime or as env vars
# We skip COPY .env to keep it secure/flexible

# Run the bot
CMD ["python", "link_ingester_bot.py"]
