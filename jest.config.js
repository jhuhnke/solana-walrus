// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest/presets/js-with-ts-esm',
    testEnvironment: 'node',
    setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
    testTimeout: 60000,
    testMatch: ["**/tests/**/*.test.ts"],
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true,
            }
        ]
    },
    moduleNameMapper: {
        "^fetch-blob$": "fetch-blob",
        "^fetch-blob/file.js$": "fetch-blob/file.js"
    },
    transformIgnorePatterns: [
        "/node_modules/(?!fetch-blob)"
    ]
};
