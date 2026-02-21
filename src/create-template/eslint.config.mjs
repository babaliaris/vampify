import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "external/vampify/**",
      "dist/**",
      "node_modules/**"
    ]
  },
  {
    files: ["src/**/*.ts"], 
    languageOptions:
    {
      parser: tsParser,
      parserOptions:
      {
        // Use the tscofig.json
        project: "./tsconfig.json", 
      },
    },
    plugins:
    {
      "@typescript-eslint": tsPlugin,
    },
    rules:
    {
      // Show an error in case we forget to 'await' a Promise.
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          // Ignore the built-in Node test functions.
          allowForKnownSafeCalls: [
            { from: 'package', name: 'describe', package: 'node:test' },
            { from: 'package', name: 'test', package: 'node:test' },
            { from: 'package', name: 'it', package: 'node:test' },
            { from: 'package', name: 'suite', package: 'node:test' }
          ]
        }
      ],
      
      // If we 'await' something that isn't a promise, show an error.
      "@typescript-eslint/await-thenable": "error",
    },
  },
];
