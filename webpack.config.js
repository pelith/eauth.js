const path = require('path')

const babelConfig = {
  presets: [
    [
      '@babel/env',
      {
        modules: false,
        useBuiltIns: 'usage',
        corejs: 3,
      }
    ]
  ],
  plugins: [
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    ['@babel/plugin-transform-runtime', {
      helpers: true,
      regenerator: true,
      useESModules: true,
    }]
  ]
}

module.exports = {
  entry: './src/eauth.js',
  resolve: {
    mainFields: ['module', 'browser', 'main'],
    modules: [
      'eauth.js/packages',
      // only resolve from project root, preventing version conflict of
      // dependencies in different eauth-* packages
      path.resolve(__dirname, 'node_modules')
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'eauth.js',
    library: 'Eauth',
    libraryTarget: 'var',
    libraryExport: 'default',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        }
      }
    ]
  }
}
