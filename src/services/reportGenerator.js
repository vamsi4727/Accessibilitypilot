const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateReport(results) {
  const doc = new PDFDocument();
  const reportPath = path.join(__dirname, '../../reports', `accessibility-report-${Date.now()}.pdf`);
  
  // Ensure reports directory exists
  fs.mkdirSync(path.join(__dirname, '../../reports'), { recursive: true });
  
  const writeStream = fs.createWriteStream(reportPath);
  doc.pipe(writeStream);

  // Add report content
  doc.fontSize(20).text('Accessibility Test Report', { align: 'center' });
  doc.moveDown();
  
  results.violations.forEach(violation => {
    doc.fontSize(16).text(violation.help);
    doc.fontSize(12).text(`Impact: ${violation.impact}`);
    doc.fontSize(12).text(`Description: ${violation.description}`);
    doc.moveDown();
  });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(reportPath));
    writeStream.on('error', reject);
  });
}

module.exports = {
  generateReport
}; 