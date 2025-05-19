module.exports = {
  // The test environment that will be used for testing
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/test/**/*.test.js"],

  // An array of regexp pattern strings that are matched against all test paths
  // Matched tests are skipped
  testPathIgnorePatterns: ["/node_modules/"],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ["/node_modules/", "/test/"],

  // The maximum amount of workers used to run your tests
  maxWorkers: "50%",

  // A list of paths to directories that Jest should use to search for files in
  roots: ["<rootDir>/src", "<rootDir>/test"],

  // The test runner to use
  testRunner: "jest-circus/runner",

  // Timeout for tests
  testTimeout: 10000,
};
