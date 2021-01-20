const baseConfig = require("../.eslintrc.base");

module.exports = {
  ...baseConfig,
  ignorePatterns: ["src/lib/**/*"],
  settings: {
    react: {
      version: "detect",
    },
  },
};
