module.exports = {
  apps: [
    {
      name: "grillnchill.pt",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3004",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
