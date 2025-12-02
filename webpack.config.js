// Webpack config for Expo web (if needed)
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['expo-modules-core'],
      },
    },
    argv
  );

  return config;
};

