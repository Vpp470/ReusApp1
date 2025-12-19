// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// DISABLE WATCHMAN AND FILE WATCHING to avoid ENOSPC errors
config.resolver = {
  ...config.resolver,
  useWatchman: false,
};

// Disable file watching completely - use polling instead
config.watchFolders = [];

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 1;

// Disable any file system watching
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

module.exports = config;
