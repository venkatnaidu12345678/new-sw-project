const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** Resolve junctions so Metro watches the real project tree on Windows. */
const projectRoot = fs.realpathSync(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot,
  watchFolders: [projectRoot],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
