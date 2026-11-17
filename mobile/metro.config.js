// Metro for an npm-workspaces monorepo (Expo finds the workspace root itself).
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Packages hoisted to the repo root (React Query, use-intl, expo-router) would
// otherwise pick up the root's React, a different copy from the app's, and
// hooks break. Native modules likewise must be the copy whose native code is
// built into the app. Resolve these from the app's folder always.
const SINGLETONS = new Set([
  "react",
  "react-dom",
  "react-native",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-worklets",
]);
const appOrigin = path.join(__dirname, "package.json");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name = moduleName.split("/")[0];
  if (SINGLETONS.has(name)) {
    return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
