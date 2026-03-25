module.exports = {
    apps: [
        {
            name: 'zdrink-pos',
            script: '.next/standalone/server.js',
            instances: 'max', // 使用所有 CPU 核心
            exec_mode: 'cluster',

            // 环境变量
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },

            // 错误处理
            error_file: './logs/pm2-err.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',
            time: true,

            // 自动重启
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',

            // 优雅关闭
            kill_timeout: 3000,
            wait_ready: true,
            listen_timeout: 10000,

            // 日志轮转
            log_rotate: true,
            max_lines: 100000,
            rotate_interval: '1d',

            // 高级选项
            min_uptime: '10s',
            max_restarts: 10,
            restart_delay: 4000,
        },
    ],
};
