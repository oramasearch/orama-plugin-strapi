const path = require('path')

const commonConfig = {
  target: 'node',
  externals: {
    '@oramacloud/client': 'commonjs @oramacloud/client'
  }
}

const serverConfigCommonJS = {
  ...commonConfig,
  name: 'server-cjs',
  mode: 'development',
  entry: './server/src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/server'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  }
}

const serverConfigESM = {
  ...commonConfig,
  name: 'server-esm',
  mode: 'development',
  entry: './server/src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/server'),
    filename: 'index.mjs',
    libraryTarget: 'module'
  },
  experiments: {
    outputModule: true
  }
}

module.exports = [serverConfigCommonJS, serverConfigESM]
