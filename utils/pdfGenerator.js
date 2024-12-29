const htmlPdf = require('html-pdf-node');
const path = require('path');

function generatePDFReport(results) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Accessibility Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #1a1a1a;
                    margin: 40px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .tested-url {
                    margin: 20px auto;
                    padding: 15px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    max-width: 600px;
                }
                .tested-url h2 {
                    margin: 0 0 10px 0;
                    font-size: 18px;
                    color: #1e293b;
                }
                .tested-url a {
                    color: #2563eb;
                    word-break: break-all;
                }
                .standards-section {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                .score-section {
                    text-align: center;
                    margin: 30px 0;
                    padding: 20px;
                    background: #f0f9ff;
                    border-radius: 8px;
                }
                .score {
                    font-size: 48px;
                    font-weight: bold;
                    color: #2563eb;
                }
                .grade {
                    display: inline-block;
                    padding: 5px 20px;
                    border-radius: 4px;
                    color: white;
                    font-weight: bold;
                }
                .grade-a-plus, .grade-a { background-color: #22c55e; }
                .grade-b { background-color: #84cc16; }
                .grade-c { background-color: #eab308; }
                .grade-d { background-color: #f97316; }
                .grade-f { background-color: #ef4444; }
                
                .summary-box {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .violation {
                    margin: 20px 0;
                    padding: 20px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                }
                .violation-header {
                    background: #f3f4f6;
                    padding: 10px;
                    margin: -20px -20px 20px -20px;
                    border-radius: 8px 8px 0 0;
                }
                .impact-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: white;
                    font-size: 0.875rem;
                }
                .impact-critical { background-color: #dc2626; }
                .impact-serious { background-color: #ea580c; }
                .impact-moderate { background-color: #d97706; }
                .impact-minor { background-color: #65a30d; }
                
                .code-block {
                    background: #f8fafc;
                    padding: 10px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.875rem;
                    overflow-x: auto;
                }
                .suggestions {
                    background: #f0f9ff;
                    padding: 15px;
                    border-radius: 4px;
                    margin-top: 15px;
                }
                @page {
                    margin: 40px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Accessibility Test Results</h1>
                <div class="tested-url">
                    <h2>Website Tested</h2>
                    <a href="${results.url}">${results.url}</a>
                </div>
            </div>

            <div class="standards-section">
                <h2>Standards Checked</h2>
                <ul>
                    <li>WCAG 2.0 Level A</li>
                    <li>WCAG 2.0 Level AA</li>
                    <li>WCAG 2.1 Level A</li>
                    <li>WCAG 2.1 Level AA</li>
                </ul>
                
                <h3>Key Areas Evaluated</h3>
                <ul>
                    <li>Color Contrast and Visual Presentation</li>
                    <li>Document Structure and Navigation</li>
                    <li>Image and Media Accessibility</li>
                    <li>Form Controls and Labels</li>
                    <li>Keyboard Navigation and Focus</li>
                    <li>Language and Text Content</li>
                    <li>Dynamic Content and ARIA</li>
                    <li>Mobile and Responsive Accessibility</li>
                </ul>
            </div>

            <div class="score-section">
                <h2>Accessibility Score</h2>
                <div class="score">${results.aiAnalysis.score}/100</div>
                <div class="grade grade-${results.aiAnalysis.grade.toLowerCase()}">${results.aiAnalysis.grade}</div>
                <p>${results.aiAnalysis.explanation}</p>
            </div>

            <div class="summary-box">
                <h2>Quick Summary</h2>
                <p>URL Tested: ${results.url}</p>
                <p>Test Date: ${new Date(results.timestamp).toLocaleString()}</p>
                <p>Total Issues Found: ${results.violations.length}</p>
                <p>Passing Tests: ${results.passes.length}</p>
            </div>

            ${results.violations.length > 0 ? `
                <h2>Detailed Violations</h2>
                ${results.violations.map(violation => `
                    <div class="violation">
                        <div class="violation-header">
                            <span class="impact-badge impact-${violation.impact}">${violation.impact}</span>
                            <strong>${violation.help}</strong>
                        </div>
                        <p>${violation.description}</p>
                        <p><a href="${violation.helpUrl}">WCAG Reference</a></p>
                        ${violation.nodes.length > 0 ? `
                            <h4>Affected Elements:</h4>
                            <div class="code-block">
                                ${violation.nodes.map(node => `<p>${node.html}</p>`).join('')}
                            </div>
                        ` : ''}
                        ${violation.aiSuggestions ? `
                            <div class="suggestions">
                                <h4>AI Suggestions:</h4>
                                ${violation.aiSuggestions}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            ` : ''}
        </body>
        </html>
    `;

    const options = {
        format: 'A4',
        margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
        printBackground: true,
        preferCSSPageSize: true
    };

    return htmlPdf.generatePdf({ content: html }, options);
}

export { generatePDFReport };