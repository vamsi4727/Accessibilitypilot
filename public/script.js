document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('testForm');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    const exportButton = document.getElementById('exportPdf');
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner');
    
    let currentReportId = null;

    const setLoading = (isLoading) => {
        spinner.hidden = !isLoading;
        spinner.classList.add('white');
        buttonText.textContent = isLoading ? 'Testing...' : 'Test Accessibility';
        submitButton.disabled = isLoading;
        if (isLoading) {
            resultsContent.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Running accessibility tests...</p>
                </div>
            `;
        }
    };

    const displayResults = (results) => {
        const violations = results.violations || [];
        const passes = results.passes || [];
        
        const getImpactClass = (impact) => {
            return impact ? impact.toLowerCase() : 'minor';
        };

        const getGradeClass = (grade) => {
            return `grade-${grade.toLowerCase().replace('+', '-plus')}`;
        };

        return `
            <div class="success">
                <h3>Analysis Complete!</h3>
                <div class="tested-url">
                    <strong>Website Tested:</strong> <a href="${results.url}" target="_blank">${results.url}</a>
                </div>
                ${results.aiAnalysis ? `
                    <div class="score-section">
                        <h4>Accessibility Score</h4>
                        <div class="score-display">
                            <span class="score-value">${results.aiAnalysis.score}</span>
                            <span class="score-max">/100</span>
                        </div>
                        <div class="grade-badge ${getGradeClass(results.aiAnalysis.grade)}">
                            Grade: ${results.aiAnalysis.grade}
                        </div>
                        <p class="score-explanation">${results.aiAnalysis.explanation}</p>
                    </div>
                ` : ''}
                <div class="impact-summary">
                    ${Object.entries(results.summary.impactCounts).map(([impact, count]) => `
                        <span class="impact-badge impact-${impact.toLowerCase()}">
                            ${count} ${impact}
                        </span>
                    `).join('')}
                </div>
                
                <p>Found ${violations.length} violations and ${passes.length} passing tests</p>
                
                ${violations.length > 0 ? `
                    <h4>Violations:</h4>
                    <ul class="violations-list">
                        ${violations.map(v => `
                            <li class="${getImpactClass(v.impact)}">
                                <div class="violation-header">
                                    <span class="impact-badge impact-${getImpactClass(v.impact)}">
                                        ${v.impact}
                                    </span>
                                    <strong>${v.help}</strong>
                                </div>
                                <p>${v.description}</p>
                                <div class="violation-details">
                                    <a href="${v.helpUrl}" target="_blank" rel="noopener">
                                        Learn more about this issue
                                    </a>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('url').value;
        resultsDiv.hidden = true;
        exportButton.hidden = true;
        setLoading(true);
        
        try {
            const response = await fetch('/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentReportId = data.reportId;
                resultsContent.innerHTML = displayResults(data.results);
                exportButton.hidden = false;
            } else {
                let errorMessage = data.error;
                switch (data.code) {
                    case 'INVALID_URL':
                        errorMessage = 'Please enter a valid website URL starting with http:// or https://';
                        break;
                    case 'NAVIGATION_ERROR':
                        errorMessage = 'Could not access the website. Please check if the URL is correct and the website is accessible.';
                        break;
                    case 'TIMEOUT_ERROR':
                        errorMessage = 'The website took too long to respond. Please try again later.';
                        break;
                    case 'RATE_LIMIT':
                        errorMessage = 'Too many requests. Please wait a few minutes and try again.';
                        break;
                }

                resultsContent.innerHTML = `
                    <div class="error">
                        <h3>Error</h3>
                        <p>${errorMessage}</p>
                        ${data.details ? `<p class="error-details">Details: ${data.details}</p>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            resultsContent.innerHTML = `
                <div class="error">
                    <h3>Error</h3>
                    <p>Failed to complete accessibility test: ${error.message}</p>
                    <p>Please try again later or contact support if the problem persists.</p>
                </div>
            `;
        } finally {
            setLoading(false);
            resultsDiv.hidden = false;
        }
    });

    exportButton.addEventListener('click', () => {
        if (currentReportId) {
            window.location.href = `/export-pdf/${currentReportId}`;
        }
    });
}); 