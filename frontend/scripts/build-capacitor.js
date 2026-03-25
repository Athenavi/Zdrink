/**
 * Capacitor 移动端打包脚本
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors.bright}${colors[color]}${message}${colors.reset}`);
}

function exec(command) {
    try {
        execSync(command, {stdio: 'inherit'});
    } catch (error) {
        log(`执行失败：${command}`, 'red');
        process.exit(1);
    }
}

// 检查环境
function checkEnvironment() {
    log('检查环境...', 'blue');

    // 检查 Node.js
    try {
        execSync('node --version', {stdio: 'ignore'});
        log('✓ Node.js 已安装', 'green');
    } catch {
        log('✗ 请先安装 Node.js', 'red');
        process.exit(1);
    }

    // 检查 Capacitor
    try {
        execSync('npx cap --version', {stdio: 'ignore'});
        log('✓ Capacitor 已安装', 'green');
    } catch {
        log('✗ 请先安装 Capacitor', 'red');
        process.exit(1);
    }

    // 检查 Android Studio（如果构建 Android）
    if (process.argv.includes('--android')) {
        if (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) {
            log('✓ Android SDK 已配置', 'green');
        } else {
            log('⚠ 未检测到 ANDROID_HOME，请确保已安装 Android Studio', 'yellow');
        }
    }

    // 检查 Xcode（如果构建 iOS，仅 macOS）
    if (process.argv.includes('--ios') && process.platform === 'darwin') {
        try {
            execSync('xcodebuild -version', {stdio: 'ignore'});
            log('✓ Xcode 已安装', 'green');
        } catch {
            log('⚠ 未检测到 Xcode，请确保已安装', 'yellow');
        }
    }
}

// 构建 Next.js
function buildNextJS() {
    log('构建 Next.js...', 'blue');
    process.env.CAPACITOR = 'true';
    exec('npm run build:export');
    log('✓ Next.js 构建完成', 'green');
}

// 同步 Capacitor
function syncCapacitor(platform) {
    log(`同步 Capacitor ${platform}...`, 'blue');
    exec(`npx cap sync ${platform}`);
    log(`✓ Capacitor ${platform} 同步完成`, 'green');
}

// 打开 IDE
function openIDE(platform) {
    log(`打开 ${platform} IDE...`, 'blue');
    exec(`npx cap open ${platform}`);
}

// 运行应用
function runApp(platform) {
    log(`在 ${platform} 上运行应用...`, 'blue');
    exec(`npx cap run ${platform}`);
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const platform = args.find(arg => ['--android', '--ios'].includes(arg));
    const action = args.find(arg => ['--sync', '--open', '--run', '--build'].includes(arg));

    log('========================================', 'bright');
    log('  zDrink POS - Capacitor 打包工具', 'bright');
    log('========================================', 'bright');
    log('');

    // 检查环境
    checkEnvironment();
    log('');

    // 执行操作
    if (action === '--build' || !action) {
        buildNextJS();
    }

    if (platform && (action === '--sync' || !action)) {
        syncCapacitor(platform.replace('--', ''));
    }

    if (platform && action === '--open') {
        openIDE(platform.replace('--', ''));
    }

    if (platform && action === '--run') {
        runApp(platform.replace('--', ''));
    }

    log('');
    log('========================================', 'bright');
    log('  完成！', 'green');
    log('========================================', 'bright');
    log('');
    log('下一步操作:', 'blue');
    log('  Android: 在 Android Studio 中构建签名 APK/AAB', 'bright');
    log('  iOS: 在 Xcode 中构建并签名 IPA', 'bright');
    log('');
    log('或者运行:', 'blue');
    log('  npm run cap:sync:android  - 同步到 Android', 'bright');
    log('  npm run cap:sync:ios     - 同步到 iOS', 'bright');
    log('  npm run cap:open:android - 打开 Android Studio', 'bright');
    log('  npm run cap:open:ios     - 打开 Xcode', 'bright');
    log('');
}

main();
