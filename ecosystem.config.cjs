module.exports = {
  apps: [{
    name: 'tempmail',
    script: './dist/index.js',
    cwd: '/var/www/tempmail',
    instances: 1,
    exec_mode: 'fork',
    env_file: '/var/www/tempmail/.env',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      BASE_PATH: '/tempmail'
    },
    error_file: '/var/www/tempmail/logs/err.log',
    out_file: '/var/www/tempmail/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
