# TaxiLibre Playwright Testing Setup

## Overview
This project has been configured with Playwright for end-to-end testing.

## Project Structure
- playwright.config.ts - Playwright configuration
- tests/ - Directory containing test files
  - example.test.ts - Basic example test
  - taxilibre.test.ts - Sample tests for TaxiLibre application

## Available Scripts
In package.json, the following scripts have been added:

- npm run test:e2e - Run Playwright tests in headless mode
- npm run test:e2e:headed - Run Playwright tests in headed mode (visible browser)
- npm run test:e2e:debug - Run Playwright tests in debug mode
- npx playwright show-report - View the HTML test report

## How to Test Your Application

### 1. Start Your Application
Before running E2E tests, make sure your application is running:

npm run dev

### 2. Run the Tests
npm run test:e2e

### 3. View Test Reports
npx playwright show-report

## Writing Tests
Edit the files in the tests/ directory to create your end-to-end tests.

## Configuration
The playwright.config.ts file is configured to:
- Use Chromium browser
- Run tests from the ./tests directory
- Set base URL to http://localhost:3000 (adjust as needed)
- Generate HTML reports
- Retry failed tests once in CI

## Next Steps
1. Update the base URL in playwright.config.ts to match your application's URL
2. Replace the example tests with actual tests for your TaxiLibre features
3. Consider adding tests for user authentication, ride booking, payment processing, etc.

For more information, see the Playwright documentation.
