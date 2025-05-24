# Tests Directory

This directory contains comprehensive tests for the Linear API pagination implementation.

## Test Structure

```
tests/
├── README.md                 # This file
├── run-all.js               # Main test runner
├── pagination.test.js       # Unit tests for pagination logic
├── integration.test.js      # Integration tests for API workflow
└── helpers/
    └── mock-data.js         # Mock data generators and test utilities
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Pagination unit tests only
npm run test:pagination

# Integration tests only
npm run test:integration
```

### Run Individual Test Files
```bash
# Run all tests
node tests/run-all.js

# Run specific test files
node tests/pagination.test.js
node tests/integration.test.js
```

## Test Coverage

### Unit Tests (`pagination.test.js`)
- ✅ Small dataset pagination (15 issues)
- ✅ Medium dataset pagination (150 issues) 
- ✅ Large dataset pagination (350 issues)
- ✅ Exactly one page scenarios
- ✅ Empty dataset handling
- ✅ Display limit functionality

### Integration Tests (`integration.test.js`)
- ✅ `fetchIssuesPage()` function behavior
- ✅ `fetchAllIssues()` complete workflow
- ✅ Display logic and message formatting

### Test Utilities (`helpers/mock-data.js`)
- Mock Linear issue generation
- Mock pagination response simulation
- Test scenario execution helpers
- Response validation utilities

## Key Features Tested

### Pagination Logic
- **Cursor-based pagination**: Proper handling of `endCursor` and `hasNextPage`
- **Batch processing**: Efficient fetching in configurable batch sizes
- **Complete retrieval**: Ensures ALL issues are fetched regardless of total count
- **Safety limits**: Prevents infinite loops with maximum page limits

### Display Logic
- **Limited display**: Shows only first 20 issues in UI
- **Count messaging**: Proper "Showing X of Y issues" formatting
- **Edge cases**: Handles empty datasets, single pages, exact limits

### Error Handling
- **API errors**: Graceful handling of network and GraphQL errors
- **Invalid responses**: Validation of response structure
- **Progress feedback**: Real-time updates during long operations

## Test Data

Tests use realistic mock data that simulates:
- Linear issue structure with all required fields
- Proper GraphQL pagination response format
- Various dataset sizes (0 to 350+ issues)
- Different team, assignee, and label configurations

## Continuous Integration

These tests are designed to:
- Run quickly (< 5 seconds total)
- Require no external dependencies
- Provide clear pass/fail feedback
- Cover all critical pagination scenarios

## Adding New Tests

To add new test scenarios:

1. **Unit Tests**: Add new test methods to `PaginationTests` class
2. **Integration Tests**: Add new test functions to `integration.test.js`
3. **Mock Data**: Extend helpers in `mock-data.js` as needed
4. **Test Runner**: Update `run-all.js` if adding new test files

## Test Philosophy

These tests follow the principle that **tests should be organized in their own directory** for:
- Clear separation of concerns
- Easy maintenance and updates
- Better project organization
- Simplified CI/CD integration
- Improved developer experience
