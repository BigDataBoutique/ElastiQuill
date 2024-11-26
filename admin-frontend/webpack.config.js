const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssUrlRelativePlugin = require("css-url-relative-plugin");
const webpack = require("webpack");

const isDevelopment = process.env.NODE_ENV !== "production";

module.exports = {
  mode: isDevelopment ? "development" : "production",
  entry: "./src/index.js",
  devtool: isDevelopment ? "eval-source-map" : false,

  output: {
    path: path.resolve(__dirname, "build"),
    filename: "assets/[name].[contenthash:8].js",
    publicPath: "",
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: [
          isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name].[hash:8].[ext]",
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/fonts/[name].[hash:8].[ext]",
        },
      },
      {
        test: require.resolve("jquery"),
        loader: "expose-loader",
        options: {
          exposes: ["$", "jQuery"],
        },
      },
    ],
  },

  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "jquery-ui/ui/widget": "jquery-ui-dist/jquery-ui.js",
      "react-dom": "@hot-loader/react-dom",
    },
    fallback: {
      process: require.resolve("process/browser"),
      path: require.resolve("path-browserify"),
      fs: false,
    },
  },

  plugins: [
    new CssUrlRelativePlugin({ root: "." }),

    new HtmlWebpackPlugin({
      template: "./public/template.html",
      inject: true,
      favicon: "./src/assets/img/favicon.ico",
    }),

    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
    }),

    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
      "window.$": "jquery",
    }),

    new webpack.DefinePlugin({
      SUPPRESS_DEPRECATED_WARNING: true,
      "process.env": JSON.stringify(process.env),
    }),

    new webpack.ProvidePlugin({
      process: "process/browser",
    }),

    ...(isDevelopment
      ? []
      : [
          new MiniCssExtractPlugin({
            filename: "assets/[name].[contenthash:8].css",
          }),
        ]),
  ],

  optimization: {
    splitChunks: {
      chunks: "all",
      name: false,
    },
    runtimeChunk: "single",
  },

  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    hot: true,
    historyApiFallback: true,
    proxy: {
      "/api": "http://localhost:5001",
    },
    client: {
      overlay: true,
    },
  },

  externals: {
    "jquery-ui": "jquery-ui",
  },
};
