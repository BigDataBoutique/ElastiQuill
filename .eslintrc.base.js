module.exports = {
  env: { browser: true, node: true, "jest/globals": true, es6: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
  ],
  plugins: ["jest"],
  rules: {
    "react/prop-types": "off",
    "react/jsx-no-target-blank": "off",
    "require-atomic-updates": "off",
    "no-unused-vars": ["error", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    "no-console": "off",
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
      modules: true,
      legacyDecorators: true,
    },
  },
  parser: "babel-eslint",
};
