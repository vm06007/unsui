const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { prepareStations } = require('./scripts/prepare-stations.cjs');

// Runs for Metro development and native release JS bundling on both platforms.
module.exports = (async () => {
  await prepareStations();
  return mergeConfig(getDefaultConfig(__dirname), {});
})();
