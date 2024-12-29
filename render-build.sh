#!/usr/bin/env bash

# Exit on error
set -e

echo "Starting build process..."

# Install npm dependencies
echo "Installing npm dependencies..."
npm install

# Install Playwright
echo "Installing Playwright Chromium..."
export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
export PLAYWRIGHT_SKIP_BROWSER_GC=1

# Use npx for Playwright commands
echo "Installing Playwright browser..."
npx playwright install chromium --with-deps

# Verify installation
echo "Verifying Playwright installation..."
npx playwright --version

echo "Build process completed"