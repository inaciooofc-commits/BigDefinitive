module.exports = {
  apps: [{
    name: 'big-server',
    script: './server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '350M',
    kill_timeout: 5000,
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || '8088',
      HOST: process.env.HOST || '0.0.0.0',
      DATA_DIR: process.env.DATA_DIR || '/opt/big-server/data',
      LOG_DIR: process.env.LOG_DIR || '/opt/big-server/logs'
    }
  }]
};
