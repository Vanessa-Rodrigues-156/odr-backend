module.exports = {
  apps: [{
    name: "backend-api",
    script: "./dist/server.js",
    env: {
      NODE_ENV: "production",
      PORT: 4000
    },
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "300M",
    env_production: {
      NODE_ENV: "production",
      PORT: 4000
    }
  }]
};
