module.exports = {
  apps: [{
    name: 'tempmail',
    script: './start.sh',
    cwd: '/var/www/tempmail',
    instances: 1,
    exec_mode: 'fork',
    interpreter: '/bin/bash',
    error_file: '/var/www/tempmail/logs/err.log',
    out_file: '/var/www/tempmail/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
