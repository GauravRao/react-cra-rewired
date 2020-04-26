const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const paths = require("react-scripts/config/paths");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

/**
 * Utility function to replace plugins in the webpack config files used by react-scripts
 */
const replacePlugin = (plugins, nameMatcher, newPlugin) => {
  const pluginIndex = plugins.findIndex(plugin => {
    return (
      plugin.constructor &&
      plugin.constructor.name &&
      nameMatcher(plugin.constructor.name)
    );
  });

  if (pluginIndex === -1) return plugins;

  return plugins
    .slice(0, pluginIndex)
    .concat(newPlugin)
    .concat(plugins.slice(pluginIndex + 1));
};

module.exports = function override(config, env) {
  const isEnvDevelopment = process.env.NODE_ENV !== "production";
  const isEnvProduction = process.env.NODE_ENV === "production";

  config.plugins = [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ];
  config.output = {
    chunkFilename: "[name].bundle.js",
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "build")
  };
  config.optimization = {
    chunkIds: "named",
    namedModules: true,
    namedChunks: true
  };

  const indexHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        filename: "index.html",
        inject: true,
        template: resolveApp("public/index.html")
      },
      undefined
    )
  );

  config.plugins = replacePlugin(
    config.plugins,
    name => /HtmlWebpackPlugin/i.test(name),
    indexHtmlPlugin
  );

  const publicPath = isEnvProduction
    ? paths.servedPath
    : isEnvDevelopment && "/";

  const multiEntryManfiestPlugin = new ManifestPlugin({
    fileName: "asset-manifest.json",
    publicPath: publicPath,
    generate: (seed, files, entrypoints) => {
      const manifestFiles = files.reduce((manifest, file) => {
        manifest[file.name] = file.path;
        return manifest;
      }, seed);

      const entrypointFiles = {};
      Object.keys(entrypoints).forEach(entrypoint => {
        entrypointFiles[entrypoint] = entrypoints[entrypoint].filter(
          fileName => !fileName.endsWith(".map")
        );
      });

      return {
        files: manifestFiles,
        entrypoints: entrypointFiles
      };
    }
  });

  config.plugins = replacePlugin(
    config.plugins,
    name => /ManifestPlugin/i.test(name),
    multiEntryManfiestPlugin
  );

  return config;
};