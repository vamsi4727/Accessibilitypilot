#!/usr/bin/env bash

# Exit on error
set -e

# Install system dependencies for Playwright
apt-get update
apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0

# Install npm dependencies
npm install

# Install only Chromium browser and its dependencies
npx playwright install chromium
npx playwright install-deps chromium

# Verify Playwright installation
echo "Verifying Playwright installation..."
npx playwright --version

# Build the application
npm run build