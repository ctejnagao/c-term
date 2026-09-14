module.exports = {
  apps: [
    {
      name: 'c-terp',
      cwd: 'D:\\C-TERP',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};