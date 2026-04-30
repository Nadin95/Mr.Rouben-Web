// pm2 ecosystem file — para producción
// Uso: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'mr-rouben',
      script: './dist/server.js',
      instances: 1,            // Cambiar a 'max' si el VPS tiene múltiples cores
      exec_mode: 'fork',       // Cambiar a 'cluster' si instances > 1
      watch: false,
      max_memory_restart: '400M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
