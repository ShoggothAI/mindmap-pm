// Mock data generators and test helpers for pagination tests

/**
 * Generate a mock Linear issue
 */
function generateMockIssue(id) {
    return {
        id: `issue-${id}`,
        identifier: `TEST-${id}`,
        title: `Test Issue ${id}`,
        description: `Description for test issue ${id}`,
        priority: Math.floor(Math.random() * 5),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        url: `https://linear.app/test/issue/TEST-${id}`,
        state: {
            name: ['Todo', 'In Progress', 'Done', 'Cancelled'][Math.floor(Math.random() * 4)],
            type: ['unstarted', 'started', 'completed', 'cancelled'][Math.floor(Math.random() * 4)]
        },
        assignee: Math.random() > 0.3 ? {
            name: ['Alice', 'Bob', 'Charlie', 'Diana'][Math.floor(Math.random() * 4)],
            email: 'user@example.com'
        } : null,
        team: {
            name: ['Engineering', 'Design', 'Product', 'QA'][Math.floor(Math.random() * 4)],
            key: ['ENG', 'DES', 'PRD', 'QA'][Math.floor(Math.random() * 4)]
        },
        creator: {
            name: 'Test User'
        },
        labels: {
            nodes: Math.random() > 0.5 ? [
                {
                    name: ['bug', 'feature', 'improvement'][Math.floor(Math.random() * 3)],
                    color: ['#ff0000', '#00ff00', '#0000ff'][Math.floor(Math.random() * 3)]
                }
            ] : []
        }
    };
}

/**
 * Generate a mock pagination response
 */
function generateMockPage(pageNumber, pageSize, totalIssues) {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalIssues);
    const hasNextPage = endIndex < totalIssues;
    
    const issues = [];
    for (let i = startIndex; i < endIndex; i++) {
        issues.push(generateMockIssue(i + 1));
    }
    
    return {
        data: {
            issues: {
                pageInfo: {
                    hasNextPage: hasNextPage,
                    endCursor: hasNextPage ? `cursor-${endIndex}` : null
                },
                nodes: issues
            }
        }
    };
}

/**
 * Test a pagination scenario and return results
 */
async function testPaginationScenario(scenario) {
    const { totalIssues, batchSize } = scenario;
    const DISPLAY_LIMIT = 20;
    
    let allFetchedIssues = [];
    let pageNumber = 1;
    let hasNextPage = true;
    
    // Simulate pagination
    while (hasNextPage && totalIssues > 0) {
        const mockResponse = generateMockPage(pageNumber, batchSize, totalIssues);
        const issues = mockResponse.data.issues.nodes;
        
        allFetchedIssues = allFetchedIssues.concat(issues);
        hasNextPage = mockResponse.data.issues.pageInfo.hasNextPage;
        pageNumber++;
    }
    
    // Simulate display logic
    const issuesToDisplay = allFetchedIssues.slice(0, DISPLAY_LIMIT);
    const cached = Math.max(0, allFetchedIssues.length - DISPLAY_LIMIT);
    
    return {
        totalFetched: allFetchedIssues.length,
        displayed: issuesToDisplay.length,
        cached: cached,
        pagesRequired: totalIssues > 0 ? pageNumber - 1 : 1,
        allIssues: allFetchedIssues,
        displayedIssues: issuesToDisplay
    };
}

/**
 * Validate pagination response structure
 */
function validatePaginationResponse(response) {
    if (!response.data || !response.data.issues) {
        throw new Error('Invalid response structure: missing data.issues');
    }
    
    const issues = response.data.issues;
    
    if (!issues.pageInfo) {
        throw new Error('Invalid response structure: missing pageInfo');
    }
    
    if (!Array.isArray(issues.nodes)) {
        throw new Error('Invalid response structure: nodes is not an array');
    }
    
    if (typeof issues.pageInfo.hasNextPage !== 'boolean') {
        throw new Error('Invalid response structure: hasNextPage is not boolean');
    }
    
    return true;
}

module.exports = {
    generateMockIssue,
    generateMockPage,
    testPaginationScenario,
    validatePaginationResponse
};
