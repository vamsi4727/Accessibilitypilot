/**
 * Calculate accessibility score based on WCAG guidelines
 * @param {Object} data - Accessibility test data
 * @param {number} data.critical_issues - Number of critical issues
 * @param {number} data.major_issues - Number of major issues
 * @param {number} data.minor_issues - Number of minor issues
 * @param {number} data.best_practices_followed - Number of best practices followed
 * @returns {Object} Accessibility score and analysis
 */
export function calculateAccessibilityScore(data) {
    // Base score starts at 100
    let score = 100;

    // Calculate deductions and bonuses
    const criticalDeductions = (data.critical_issues || 0) * -10;
    const majorDeductions = (data.major_issues || 0) * -5;
    const minorDeductions = (data.minor_issues || 0) * -2;
    const bestPracticesBonus = Math.min((data.best_practices_followed || 0), 20); // Cap bonus at 20 points

    // Apply all modifications to score
    score += criticalDeductions;
    score += majorDeductions;
    score += minorDeductions;
    score += bestPracticesBonus;

    // Ensure score stays within 0-100 range
    score = Math.max(0, Math.min(100, score));

    // Determine grade based on score
    let grade;
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
        score,
        grade,
        breakdown: {
            baseScore: 100,
            criticalDeductions,
            majorDeductions,
            minorDeductions,
            bestPracticesBonus,
            finalScore: score
        },
        explanation: `This website scored ${score}/100 (Grade: ${grade}). ` +
                    `\nFound:\n` +
                    `• ${data.critical_issues} critical issues\n` +
                    `• ${data.major_issues} major issues\n` +
                    `• ${data.minor_issues} minor issues\n\n` +
                    `${data.best_practices_followed} best practices being followed`,
        improvements: [
            data.critical_issues > 0 ? 
                `CRITICAL: Address ${data.critical_issues} critical accessibility violations (${criticalDeductions} points)` : null,
            data.major_issues > 0 ?
                `MAJOR: Fix ${data.major_issues} major accessibility issues (${majorDeductions} points)` : null,
            data.minor_issues > 0 ?
                `MINOR: Resolve ${data.minor_issues} minor accessibility concerns (${minorDeductions} points)` : null,
        ].filter(Boolean),
        positives: [
            data.best_practices_followed > 0 ?
                `Following ${data.best_practices_followed} accessibility best practices (+${bestPracticesBonus} bonus points)` : null
        ].filter(Boolean),
        recommendations: [
            data.critical_issues > 0 ? "Prioritize fixing critical issues first" : null,
            data.major_issues > 0 ? "Address major issues to significantly improve score" : null,
            "Implement automated accessibility testing",
            "Conduct regular accessibility audits",
            "Document and maintain accessibility best practices"
        ].filter(Boolean),
        scoringCriteria: {
            critical: -10,
            major: -5,
            minor: -2,
            bestPractice: 1
        }
    };
}

// Test the scoring function if this file is run directly
if (require.main === module) {
    // Test data
    const testData = {
        critical_issues: 2,
        major_issues: 5,
        minor_issues: 10,
        best_practices_followed: 15
    };

    console.log('Testing accessibility score calculation with data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\nResults:');
    console.log(JSON.stringify(calculateAccessibilityScore(testData), null, 2));

    // Calculate breakdown
    const {
        baseScore,
        criticalDeductions,
        majorDeductions,
        minorDeductions,
        bestPracticesBonus,
        finalScore
    } = calculateAccessibilityScore(testData).breakdown;

    console.log('\nDetailed Score Calculation:');
    console.log(`Base Score: ${baseScore}`);
    console.log(`Critical Issues: ${criticalDeductions} (${testData.critical_issues} × -10)`);
    console.log(`Major Issues: ${majorDeductions} (${testData.major_issues} × -5)`);
    console.log(`Minor Issues: ${minorDeductions} (${testData.minor_issues} × -2)`);
    console.log(`Best Practices Bonus: +${bestPracticesBonus} (${testData.best_practices_followed} practices, max 20)`);
    console.log(`Final Score: ${finalScore}`);
}