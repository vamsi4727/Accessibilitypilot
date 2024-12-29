import express from 'express';
import path from 'path';
import { chromium } from 'playwright-chromium';
import axeCore from 'axe-core';
import { generatePDFReport } from './utils/pdfGenerator.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { URL } from 'url';
import OpenAI from 'openai';
import { calculateAccessibilityScore } from './accessibilityScore.js';
import dotenv from 'dotenv';
import net from 'net';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Function to find an available port
const findAvailablePort = async (startPort, maxAttempts = 100) => {
  console.log(`Attempting to find available port starting from ${startPort}...`);
  if (maxAttempts <= 0) {
    throw new Error('Maximum port finding attempts reached');
  }

  if (startPort >= 65536) {
    throw new Error('No available ports found in valid range (0-65535)');
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${startPort} is in use, trying next port...`);
        resolve(findAvailablePort(parseInt(startPort) + 1, maxAttempts - 1));
      } else {
        console.error(`Error while checking port ${startPort}:`, err);
        reject(err);
      }
    });

    const port = parseInt(startPort);
    if (isNaN(port) || port < 0 || port >= 65536) {
      reject(new Error('Invalid port number'));
      return;
    }

    server.listen(port, () => {
      console.log(`Found available port: ${port}`);
      const { port: availablePort } = server.address();
      server.close(() => {
        resolve(availablePort);
      });
    });
  });
};

// Initialize OpenAI
console.log('Initializing OpenAI with API key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

if (!process.env.OPENAI_API_KEY?.startsWith('sk-') && !process.env.OPENAI_API_KEY?.startsWith('sk-proj-')) {
    console.error('Invalid OpenAI API key format. Key should start with "sk-" or "sk-proj-"');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/reports', express.static('reports'));

// Ensure reports directory exists
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
}

// Rest of your code remains the same, just remove the global browser launch code
// and move it into the runAccessibilityTests function

[... rest of the code remains the same until the browser configuration ...]

// Remove the global browser launch code and keep it in runAccessibilityTests

// Start the server with automatic port finding
(async () => {
  try {
    const startPort = parseInt(port) || 3000;
    console.log(`Initial port setting: ${startPort}`);
    const availablePort = await findAvailablePort(startPort);
    
    app.listen(availablePort, () => {
      console.log('----------------------------------------');
      console.log(`Server running on port ${availablePort}`);
      if (process.env.NODE_ENV === 'production') {
        console.log('Server running in production mode');
      } else {
        console.log(`Open http://localhost:${availablePort} in your browser`);
      }
      console.log('----------------------------------------');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();