const express = require('express');
const path = require('path');
const { runAccessibilityTests } = require('./services/accessibilityTester');
const { generateReport } = require('./services/reportGenerator');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/reports', express.static('reports'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Change endpoint from /analyze to /test
app.post('/test', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL is required' 
            });
        }

        const results = await runAccessibilityTests(url);
        const reportPath = await generateReport(results);
        
        res.json({ 
            success: true, 
            results,
            reportPath,
            reportId: path.basename(reportPath)
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add new endpoint for PDF export
app.get('/export-pdf/:reportId', (req, res) => {
    try {
        const reportPath = path.join(__dirname, '../reports', req.params.reportId);
        res.download(reportPath);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to export PDF' 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 