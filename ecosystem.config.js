module.exports = {
    apps: [{
      name: 'pp-backend',
      script: 'dist/app.js',
      instances: 4, // Use 4 instances for KVM 4 cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      watch: false, // Disable file watching in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      min_uptime: '10s', // Minimum uptime before considering app stable
      max_restarts: 10, // Maximum number of restarts in 1 minute
      restart_delay: 4000, // Delay between restarts
      merge_logs: true, // Merge logs from all instances
      kill_timeout: 5000 // Time to wait before force killing
    }]
  }
  