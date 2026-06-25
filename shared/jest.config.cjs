/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/tests/**/*.test.ts"],
    moduleFileExtensions: ["ts", "js"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.test.json",
            },
        ],
    },
};
