const {merge} = require('@neutrinojs/compile-loader');
const path = require('path');

module.exports = {
  options: {
    root: __dirname
  },
  use: [
    [
      '@neutrinojs/react',
      {
        html: {
          title: 'Admin Panel',
          favicon: './src/assets/img/favicon.ico'
        },
        devServer: {
          proxy: {
            '/api': 'http://localhost:5000'
          }
        }
      }
    ],
    neutrino => {
      neutrino.config.output
        .publicPath('');

      neutrino.config.module //needed because of how neutrino handles plugin configuration
        .rule('compile')
        .use('babel')
        .tap(options => merge({
          plugins: [
            [require.resolve('@babel/plugin-proposal-decorators'), {legacy: true}],
            [require.resolve('@babel/plugin-proposal-class-properties'), {loose: true}],
            require.resolve('@babel/plugin-transform-classes'),
            [require.resolve('@babel/plugin-transform-regenerator'), {asyncGenerators: false}],
            require.resolve('@babel/plugin-transform-runtime')
          ]
        }, options));
    }
  ]
};
