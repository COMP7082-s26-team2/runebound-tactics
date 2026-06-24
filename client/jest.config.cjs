/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/src/**/*.test.ts"],
    moduleFileExtensions: ["ts", "tsx", "js"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.test.json",
            },
        ],
    },
    moduleNameMapper: {
        // autotile-core vendor uses `.js` suffixes (ESM convention); jest/ts-jest
        // needs explicit mapping to resolve them to .ts during tests.
        "^(\\.{1,2}/.*)\\.js$": "$1",
        // mirror tsconfig.json `@/*` path alias
        "^@/(.*)$": "<rootDir>/src/$1",
    },
};
