const path = require("path");
const nodeExternals = require("webpack-node-externals");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/server",
  target: "node",
  node: {
    __filename: true,
    __dirname: false,
  },
  externals: [nodeExternals()],
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./src/views", to: "views" }],
    }),
  ],
  output: {
    filename: "server.js",
    path: path.resolve(__dirname, "dist"),
  },
};
