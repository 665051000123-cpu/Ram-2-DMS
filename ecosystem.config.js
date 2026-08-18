module.exports = {
  apps: [
    {
      name: "dms-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 5175,
      },
    },
    {
      name: "dms-scanner",
      script: "scanner-watcher.js",
      env: {
        NODE_ENV: "production",
      },
    }
  ]
};
