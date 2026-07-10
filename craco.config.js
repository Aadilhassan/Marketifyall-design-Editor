const path = require('path')

const resloveSrc = (...paths) => path.join(__dirname, 'src', ...paths)

module.exports = {
  webpack: {
    alias: {
      '@': resloveSrc(),
      '@assets': resloveSrc('assets'),
      '@components': resloveSrc('components'),
      '@common': resloveSrc('common'),
      '@contexts': resloveSrc('contexts'),
      '@hooks': resloveSrc('hooks'),
      '@scenes': resloveSrc('scenes'),
      '@store': resloveSrc('store'),
      '@services': resloveSrc('services'),
      '@utils': resloveSrc('utils'),
      '@handlers': resloveSrc('handlers'),
    },
    configure: (webpackConfig) => {
      // @supabase/ssr (and its cookie dep) ship ES2020 syntax (`?.`, `??`)
      // that webpack 4's parser can't read. Transpile just those packages.
      const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf)
      if (oneOfRule) {
        oneOfRule.oneOf.unshift({
          test: /\.(js|mjs)$/,
          include: [
            path.join(__dirname, 'node_modules', '@supabase', 'ssr'),
            path.join(__dirname, 'node_modules', 'cookie'),
          ],
          loader: require.resolve('babel-loader', {
            paths: [path.join(__dirname, 'node_modules', 'react-scripts')],
          }),
          options: {
            babelrc: false,
            configFile: false,
            compact: false,
            sourceType: 'unambiguous',
            cacheDirectory: true,
            plugins: [
              require.resolve('@babel/plugin-proposal-optional-chaining'),
              require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
            ],
          },
        })
      }
      return webpackConfig
    },
  },
}
