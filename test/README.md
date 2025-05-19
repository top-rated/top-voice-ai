# LinkedIn Top Voices API Test Suite

This directory contains automated tests for the LinkedIn Top Voices API. The tests cover all main API endpoints and functionality.

## Test Structure

The test suite is organized into the following files:

- `auth.middleware.test.js` - Tests for authentication middleware
- `profile.routes.test.js` - Tests for profile-related API endpoints
- `search.routes.test.js` - Tests for search-related API endpoints
- `server.test.js` - Tests for general server functionality
- `user.routes.test.js` - Tests for user authentication and subscription endpoints
- `voices.routes.test.js` - Tests for LinkedIn Top Voices data endpoints
- `run-tests.js` - Helper script to run tests individually or in groups

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run specific test files using the test:* scripts
npm run test:profile  # Run profile routes tests
npm run test:search   # Run search routes tests
npm run test:user     # Run user/auth routes tests
npm run test:voices   # Run top voices routes tests
npm run test:auth     # Run auth middleware tests

# Or run specific test files directly
npx jest test/profile.routes.test.js
```

## Using the test runner script

You can also use the custom test runner script to run specific tests or get a summary of test results:

```bash
# Run all tests
node test/run-tests.js

# Run specific test by partial name match
node test/run-tests.js profile  # Run tests with "profile" in the filename
node test/run-tests.js auth     # Run tests with "auth" in the filename
```

## Test Coverage

To generate test coverage reports, run:

```bash
npm test -- --coverage
```

This will generate a coverage report in the `coverage` directory.

## Adding New Tests

When adding new features to the API, please also add corresponding tests to ensure functionality is working correctly. Follow these guidelines:

1. Create or update test files to match the API structure
2. Use descriptive `describe` and `it` blocks to clearly identify what's being tested
3. Make sure to test both success and error cases
4. Mock external dependencies to avoid actual API calls during testing
