/**
 * Test runner script for LinkedIn Top Voices API
 *
 * This script runs all test files in the test directory.
 * Use this to run all tests at once or individual tests as needed.
 *
 * Run all tests: node test/run-tests.js
 * Run specific test: node test/run-tests.js profile
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Get test files
const testDir = __dirname;
const testFiles = fs
  .readdirSync(testDir)
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => path.join(testDir, file));

// Check if a specific test was requested
const requestedTest = process.argv[2];

let testsToRun = testFiles;

if (requestedTest) {
  testsToRun = testFiles.filter((file) =>
    path.basename(file).includes(requestedTest)
  );

  if (testsToRun.length === 0) {
    console.error(`No test files matching '${requestedTest}' found.`);
    process.exit(1);
  }
}

console.log(`Running ${testsToRun.length} test files...\n`);

// Run each test file
let passedCount = 0;
let failedTests = [];

for (const testFile of testsToRun) {
  const fileName = path.basename(testFile);
  console.log(`\n=== Running ${fileName} ===`);

  try {
    execSync(`npx jest ${testFile} --verbose`, { stdio: "inherit" });
    console.log(`✅ ${fileName} passed`);
    passedCount++;
  } catch (error) {
    console.error(`❌ ${fileName} failed`);
    failedTests.push(fileName);
  }
}

// Print summary
console.log("\n=== Test Summary ===");
console.log(`Total: ${testsToRun.length}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedTests.length}`);

if (failedTests.length > 0) {
  console.log("\nFailed tests:");
  failedTests.forEach((test) => console.log(`- ${test}`));
  process.exit(1);
}

process.exit(0);
