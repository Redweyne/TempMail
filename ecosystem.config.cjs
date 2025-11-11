module.exports = {
  apps: [{
    name: 'tempmail',
    script: './dist/index.js',
    cwd: '/var/www/tempmail',
    instances: 2,
    exec_mode: 'cluster',
    env_file: '/var/www/tempmail/.env',
    error_file: '/var/www/tempmail/logs/err.log',
    out_file: '/var/www/tempmail/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
