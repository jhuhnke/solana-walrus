// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
    setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
    testTimeout: 60000, 
    testMatch: ["**/tests/**/*.test.ts"],
};