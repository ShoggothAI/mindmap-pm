// Test suite for Linear API pagination functionality
// Tests the pagination implementation without requiring real API calls

const { generateMockIssue, generateMockPage, testPaginationScenario } = require('./helpers/mock-data');

/**
 * Test suite for pagination functionality
 */
class PaginationTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run a single test and track results
     */
    async runTest(testName, testFunction) {
        console.log(`🧪 Running: ${testName}`);
        try {
            await testFunction();
            this.testResults.push({ name: testName, status: 'PASS' });
            console.log(`✅ PASS: ${testName}\n`);
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
            console.log(`❌ FAIL: ${testName} - ${error.message}\n`);
        }
    }

    /**
     * Test pagination with small dataset
     */
    async testSmallDataset() {
        const result = await testPaginationScenario({
            name: 'Small dataset (15 issues)',
            totalIssues: 15,
            batchSize: 10,
            expectedPages: 2,
            expectedDisplayed: 15
        });

        if (result.totalFetched !== 15) {
            throw new Error(`Expected 15 issues, got ${result.totalFetched}`);
        }
        if (result.pagesRequired !== 2) {
            throw new Error(`Expected 2 pages, got ${result.pagesRequired}`);
        }
    }

    /**
     * Test pagination with medium dataset
     */
    async testMediumDataset() {
        const result = await testPaginationScenario({
            name: 'Medium dataset (150 issues)',
            totalIssues: 150,
            batchSize: 100,
            expectedPages: 2,
            expectedDisplayed: 20
        });

        if (result.totalFetched !== 150) {
            throw new Error(`Expected 150 issues, got ${result.totalFetched}`);
        }
        if (result.displayed !== 20) {
            throw new Error(`Expected 20 displayed, got ${result.displayed}`);
        }
        if (result.cached !== 130) {
            throw new Error(`Expected 130 cached, got ${result.cached}`);
        }
    }

    /**
     * Test pagination with large dataset
     */
    async testLargeDataset() {
        const result = await testPaginationScenario({
            name: 'Large dataset (350 issues)',
            totalIssues: 350,
            batchSize: 100,
            expectedPages: 4,
            expectedDisplayed: 20
        });

        if (result.totalFetched !== 350) {
            throw new Error(`Expected 350 issues, got ${result.totalFetched}`);
        }
        if (result.pagesRequired !== 4) {
            throw new Error(`Expected 4 pages, got ${result.pagesRequired}`);
        }
    }

    /**
     * Test edge case: exactly one page
     */
    async testExactlyOnePage() {
        const result = await testPaginationScenario({
            name: 'Exactly one page (100 issues)',
            totalIssues: 100,
            batchSize: 100,
            expectedPages: 1,
            expectedDisplayed: 20
        });

        if (result.pagesRequired !== 1) {
            throw new Error(`Expected 1 page, got ${result.pagesRequired}`);
        }
    }

    /**
     * Test edge case: empty dataset
     */
    async testEmptyDataset() {
        const result = await testPaginationScenario({
            name: 'Empty dataset (0 issues)',
            totalIssues: 0,
            batchSize: 100,
            expectedPages: 1,
            expectedDisplayed: 0
        });

        if (result.totalFetched !== 0) {
            throw new Error(`Expected 0 issues, got ${result.totalFetched}`);
        }
    }

    /**
     * Test display limit functionality
     */
    async testDisplayLimit() {
        const DISPLAY_LIMIT = 20;
        const scenarios = [
            { total: 5, expectedDisplayed: 5 },
            { total: 20, expectedDisplayed: 20 },
            { total: 25, expectedDisplayed: 20 },
            { total: 100, expectedDisplayed: 20 }
        ];

        for (const scenario of scenarios) {
            const result = await testPaginationScenario({
                name: `Display limit test (${scenario.total} issues)`,
                totalIssues: scenario.total,
                batchSize: 100,
                expectedDisplayed: scenario.expectedDisplayed
            });

            if (result.displayed !== scenario.expectedDisplayed) {
                throw new Error(`Expected ${scenario.expectedDisplayed} displayed, got ${result.displayed}`);
            }
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting Linear API Pagination Test Suite\n');

        await this.runTest('Small Dataset Pagination', () => this.testSmallDataset());
        await this.runTest('Medium Dataset Pagination', () => this.testMediumDataset());
        await this.runTest('Large Dataset Pagination', () => this.testLargeDataset());
        await this.runTest('Exactly One Page', () => this.testExactlyOnePage());
        await this.runTest('Empty Dataset', () => this.testEmptyDataset());
        await this.runTest('Display Limit Functionality', () => this.testDisplayLimit());

        this.printSummary();
    }

    /**
     * Print test results summary
     */
    printSummary() {
        console.log('📊 Test Results Summary');
        console.log('========================');

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;

        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.name}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log(`\n📈 Results: ${passed} passed, ${failed} failed`);

        if (failed === 0) {
            console.log('🎉 All tests passed! Pagination implementation is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Please review the implementation.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tests = new PaginationTests();
    tests.runAllTests().catch(console.error);
}

module.exports = PaginationTests;
