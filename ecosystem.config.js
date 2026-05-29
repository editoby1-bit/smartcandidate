// ecosystem.config.js
// PM2 process manager — run all workers in production
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup  (auto-restart on server reboot)
//   pm2 logs                 (view all worker logs)
//   pm2 monit                (live dashboard)

module.exports = {
  apps: [
    {
      name: 'sc-baileys',
      script: 'workers/baileys-worker.ts',
      interpreter: 'node',
      interpreter_args: '-r tsx/cjs',
      instances: 1,          // only 1 — manages the full session pool internally
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      // Baileys logs QR codes to stdout — keep them visible
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'sc-sms',
      script: 'workers/sms-worker.ts',
      interpreter: 'node',
      interpreter_args: '-r tsx/cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sc-sentiment',
      script: 'workers/sentiment-worker.ts',
      interpreter: 'node',
      interpreter_args: '-r tsx/cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: { NODE_ENV: 'production' },
    },
    // Voice worker — only needed if you use robocalls
    // {
    //   name: 'sc-voice',
    //   script: 'workers/voice-worker.ts',
    //   interpreter: 'node',
    //   interpreter_args: '-r tsx/cjs',
    //   instances: 1,
    //   autorestart: true,
    //   max_memory_restart: '200M',
    // },
  ],
}
