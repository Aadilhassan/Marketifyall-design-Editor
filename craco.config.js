const path = require('path')

const resloveSrc = (...paths) => path.join(__dirname, 'src', ...paths)

// Same import aliases for Jest as for webpack, so tests can load modules that
// use `@/…` imports.
const jestAliases = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@(assets|components|common|contexts|hooks|scenes|store|services|utils|handlers)/(.*)$': '<rootDir>/src/$1/$2',
}

module.exports = {
  jest: {
    configure: (jestConfig) => {
      jestConfig.moduleNameMapper = { ...(jestConfig.moduleNameMapper || {}), ...jestAliases }
      return jestConfig
    },
  },
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
            // MP4 muxer for client-side video export (ships ES2020 syntax)
            path.join(__dirname, 'node_modules', 'mp4-muxer'),
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
