const express = require('express');
const path = require('path');
const { chromium } = require('playwright');
const axeCore = require('axe-core');
const { generatePDFReport } = require('./utils/pdfGenerator');
const fs = require('fs');
const { URL } = require('url');
const OpenAI = require('openai');
const { calculateAccessibilityScore } = require('./accessibilityScore');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Function to find an available port
const findAvailablePort = async (startPort, maxAttempts = 100) => {
  console.log(`Attempting to find available port starting from ${startPort}...`);
  // Check maximum attempts
  if (maxAttempts <= 0) {
    throw new Error('Maximum port finding attempts reached');
  }

  // Ensure port is within valid range
  if (startPort >= 65536) {
    throw new Error('No available ports found in valid range (0-65535)');
  }

  const net = require('net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${startPort} is in use, trying next port...`);
        // Try next port, but ensure it's a number
        resolve(findAvailablePort(parseInt(startPort) + 1, maxAttempts - 1));
      } else {
        console.error(`Error while checking port ${startPort}:`, err);
        reject(err);
      }
    });

    // Ensure port is a number and within valid range
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

// Validate API key format
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

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

/**
 * Custom error class for accessibility testing errors
 */
class AccessibilityTestError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'AccessibilityTestError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Gets AI-generated suggestions for accessibility violations
 * @param {Object} violation - The accessibility violation
 * @returns {Promise<string>} AI-generated suggestions
 */
async function getAISuggestions(violation) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
        }

        const prompt = `As an accessibility expert, analyze this WCAG violation:

Issue: ${violation.help}
Description: ${violation.description}
Impact Level: ${violation.impact}

Affected HTML:
${violation.nodes.map(node => node.html).join('\n')}

Please provide:
1. A brief explanation of why this is an accessibility issue
2. Specific code suggestions to fix the issue
3. Best practices to prevent this issue in the future
4. A severity score for this issue on a scale of 1-10 (10 being most severe)

Format the response in markdown.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert web accessibility consultant who provides clear, actionable advice for fixing WCAG violations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API error:', error.message);
        return `⚠️ AI suggestions unavailable: ${error.message}`;
    }
}

/**
 * Get overall accessibility score and rating from OpenAI
 * @param {Object} results - The complete accessibility test results
 * @returns {Promise<Object>} Score and rating information
 */
async function getAccessibilityRating(results) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
        }

        // Convert axe-core results to scoring format
        const accessibilityData = {
            critical_issues: results.violations.filter(v => v.impact === 'critical').length,
            major_issues: results.violations.filter(v => v.impact === 'serious').length,
            minor_issues: results.violations.filter(v => ['moderate', 'minor'].includes(v.impact)).length,
            best_practices_followed: results.passes.length
        };

        // Calculate accessibility score
        return calculateAccessibilityScore(accessibilityData);
    } catch (error) {
        console.error('OpenAI rating error:', error.message);
        return {
            score: null,
            grade: 'N/A',
            explanation: 'Unable to calculate accessibility score.',
            improvements: [],
            positives: [],
            error: error.message
        };
    }
}

/**
 * Runs accessibility tests on a given URL using Playwright and Axe-core
 * @param {string} url - The URL to test
 * @returns {Promise<Object>} The accessibility test results
 * @throws {Error} If the URL is invalid or tests fail
 */
async function runAccessibilityTests(url) {
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        throw new AccessibilityTestError(
            'Please enter a valid URL starting with http:// or https://',
            'INVALID_URL'
        );
    }

    let browser = null;
    try {
        // Launch browser with specific configuration
        browser = await chromium.launch({
            headless: true,
            chromiumSandbox: false,
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Accessibility-Test-Bot'
        });
        
        const page = await context.newPage();

        // Navigate with timeout and wait for network idle
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 30000 // 30 second timeout for page load
            });
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw new AccessibilityTestError(
                    'The page took too long to load. Please try again or check if the URL is correct.',
                    'TIMEOUT_ERROR'
                );
            }
            throw new AccessibilityTestError(
                'Failed to load the webpage. Please check if the URL is accessible.',
                'NAVIGATION_ERROR',
                error.message
            );
        }

        // Wait for any client-side rendering to complete
        await page.waitForLoadState('domcontentloaded');

        // Inject and run axe-core
        try {
            await page.evaluate(axeCore.source);
        } catch (error) {
            throw new AccessibilityTestError(
                'Failed to inject testing tools into the page.',
                'INJECTION_ERROR',
                error.message
            );
        }

        const results = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                window.axe.run(document, {
                    resultTypes: ['violations', 'passes'],
                    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
                    rules: {
                        'color-contrast': { enabled: true },
                        'document-title': { enabled: true },
                        'html-has-lang': { enabled: true },
                        'image-alt': { enabled: true },
                        'label': { enabled: true },
                        'link-name': { enabled: true },
                        'list': { enabled: true },
                        'heading-order': { enabled: true }
                    }
                }, (err, results) => {
                    if (err) reject(new AccessibilityTestError(
                        'Failed to run accessibility tests.',
                        'TEST_ERROR',
                        err.message
                    ));
                    resolve(results);
                });
            });
        });

        // Enhance results with AI suggestions
        const enhancedViolations = await Promise.all(
            results.violations.map(async violation => {
                try {
                    const aiSuggestions = await getAISuggestions(violation);
                    return {
                        ...violation,
                        aiSuggestions
                    };
                } catch (error) {
                    console.error('AI suggestion error:', error);
                    return {
                        ...violation,
                        aiSuggestions: 'AI suggestions temporarily unavailable.'
                    };
                }
            })
        );

        // Process and enhance the results
        const testResults = {
            url,
            timestamp: new Date().toISOString(),
            summary: {
                totalViolations: results.violations.length,
                totalPasses: results.passes.length,
                impactCounts: countImpacts(results.violations)
            },
            violations: enhancedViolations,
            passes: results.passes
        };

        console.log('Getting AI rating for test results...');
        // Get AI rating
        const aiRating = await getAccessibilityRating(testResults);
        console.log('Received AI rating:', aiRating);
        testResults.aiAnalysis = aiRating;

        // Verify AI analysis is properly attached
        if (!testResults.aiAnalysis) {
            console.error('AI analysis is missing from test results');
        } else {
            console.log('AI analysis successfully attached to results:', {
                score: testResults.aiAnalysis.score,
                grade: testResults.aiAnalysis.grade
            });
        }

        return testResults;
    } catch (error) {
        // Rethrow AccessibilityTestError instances
        if (error instanceof AccessibilityTestError) {
            throw error;
        }
        // Handle unexpected errors
        throw new AccessibilityTestError(
            'An unexpected error occurred while testing the website.',
            'UNKNOWN_ERROR',
            error.message
        );
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (error) {
                console.error('Failed to close browser:', error);
            }
        }
    }
}

/**
 * Counts the number of violations by impact level
 * @param {Array} violations - The violations array from axe-core results
 * @returns {Object} Counts of violations by impact level
 */
function countImpacts(violations) {
    return violations.reduce((counts, violation) => {
        counts[violation.impact] = (counts[violation.impact] || 0) + 1;
        return counts;
    }, {});
}

// Test endpoint
app.post('/test', async (req, res) => {
    console.log('Testing URL:', req.body.url);
    const { url } = req.body;

    // Validate URL
    if (!url) {
        return res.status(400).json({
            success: false,
            code: 'MISSING_URL',
            error: 'URL is required'
        });
    }

    try {
        const results = await runAccessibilityTests(url);

        // Log AI analysis results
        if (results.aiAnalysis) {
            console.log('AI Analysis Results:', {
                score: results.aiAnalysis.score,
                grade: results.aiAnalysis.grade
            });
        } else {
            console.log('No AI analysis available');
        }

        // Store results for PDF generation
        const reportId = `report-${Date.now()}.json`;
        fs.writeFileSync(
            path.join(reportsDir, reportId),
            JSON.stringify(results, null, 2)
        );

        res.json({
            success: true,
            results,
            reportId
        });
    } catch (error) {
        console.error('Test error:', error);
        const statusCode = {
            INVALID_URL: 400,
            NAVIGATION_ERROR: 404,
            TIMEOUT_ERROR: 504,
            RATE_LIMIT: 429
        }[error.code] || 500;

        res.status(statusCode).json({
            success: false,
            code: error.code || 'UNKNOWN_ERROR',
            error: error.message,
            details: error.details
        });
    }
});

// Export PDF endpoint
app.get('/export-pdf/:reportId', async (req, res) => {
    console.log('Exporting PDF for report:', req.params.reportId);
    try {
        const reportPath = path.join(reportsDir, req.params.reportId);
        
        if (!fs.existsSync(reportPath)) {
            return res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }

        const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        // Generate PDF using html-pdf-node
        const pdfBuffer = await generatePDFReport(results);
        const pdfPath = reportPath.replace('.json', '.pdf');
        fs.writeFileSync(pdfPath, pdfBuffer);
        
        res.download(pdfPath, `accessibility-report-${Date.now()}.pdf`, (err) => {
            fs.unlinkSync(reportPath); // Remove JSON
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath); // Remove PDF
            }
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF report: ' + error.message
        });
    }
});

/**
 * Returns a color for the impact level
 * @param {string} impact - The impact level
 * @returns {string} The color code
 */
function getImpactColor(impact) {
    const colors = {
        critical: '#991B1B',
        serious: '#9A3412',
        moderate: '#B45309',
        minor: '#3F6212'
    };
    return colors[impact] || '#000000';
}

/**
 * Returns a background color for the impact level header
 * @param {string} impact - The impact level
 * @returns {string} The color code
 */
function getImpactBackgroundColor(impact) {
    const colors = {
        critical: '#DC2626',  // Red
        serious: '#EA580C',   // Orange
        moderate: '#D97706',  // Amber
        minor: '#65A30D'      // Green
    };
    return colors[impact] || '#6B7280';
}

// Start the server with automatic port finding
(async () => {
  try {
    // Try to find an available port starting from the specified port
    const startPort = parseInt(port) || 3000;
    console.log(`Initial port setting: ${startPort}`);
    const availablePort = await findAvailablePort(startPort);
    
    app.listen(availablePort, () => {
      console.log('----------------------------------------');
      console.log(`Server running on port ${availablePort}`);
      console.log(`Open http://localhost:${availablePort} in your browser`);
      console.log('----------------------------------------');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    if (error.message.includes('port')) {
      console.log('Try specifying a different port:');
      console.log('PORT=3001 npm start');
      console.log('Or kill the process using the current port:');
      console.log('lsof -i :3000 | grep LISTEN');
      console.log('kill -9 <PID>');
    }
    process.exit(1);
  }
})(); 