const merge = require("babel-merge");
const path = require("path");
const react = require("@neutrinojs/react");

module.exports = {
  options: {
    root: __dirname,
  },
  use: [
    react({
      html: {
        title: "Admin Panel",
        favicon: "./src/assets/img/favicon.ico",
      },
      devServer: {
        proxy: {
          "/blog-api-route": "http://localhost:5000",
          "/api": "http://localhost:5000",
        },
      },
    }),
    neutrino => {
      neutrino.config.performance.hints(false);

      neutrino.config.output.publicPath("");

      neutrino.config.module //needed because of how neutrino handles plugin configuration
        .rule("compile")
        .use("babel")
        .tap(options =>
          merge(
            {
              plugins: [
                [
                  require.resolve("@babel/plugin-proposal-decorators"),
                  { legacy: true },
                ],
                [
                  require.resolve("@babel/plugin-proposal-class-properties"),
                  { loose: true },
                ],
                require.resolve("@babel/plugin-transform-classes"),
                //[require.resolve('@babel/plugin-transform-regenerator'), {asyncGenerators: false}],
                require.resolve("@babel/plugin-transform-runtime"),
              ],
            },
            options
          )
        );
    },
  ],
};
