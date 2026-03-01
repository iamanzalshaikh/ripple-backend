module.exports = {
  apps: [
    {
      name: "herridez-backend",
      script: "./dist/server.js",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
