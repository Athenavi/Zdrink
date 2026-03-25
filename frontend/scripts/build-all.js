/**
 * 生产环境构建脚本
 * 用于构建所有平台的应用
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
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors.bright}${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
    try {
        execSync(command, {stdio: 'inherit', ...options});
        return true;
    } catch (error) {
        log(`✗ 执行失败：${command}`, 'red');
        throw error;
    }
}

// 检查环境
function checkEnvironment() {
    log('\n检查构建环境...', 'blue');

    const checks = [
        {name: 'Node.js', command: 'node --version'},
        {name: 'npm', command: 'npm --version'},
    ];

    let allGood = true;

    checks.forEach(check => {
        try {
            execSync(check.command, {stdio: 'ignore'});
            log(`✓ ${check.name} 已安装`, 'green');
        } catch {
            log(`✗ ${check.name} 未安装`, 'red');
            allGood = false;
        }
    });

    if (!allGood) {
        log('\n请先安装缺失的依赖', 'red');
        process.exit(1);
    }

    // 检查 .env.production
    if (!fs.existsSync(path.join(__dirname, '..', '.env.production'))) {
        log('\n⚠ 警告：未找到 .env.production 文件', 'yellow');
        log('建议：从 .env.production.example 复制并修改配置', 'yellow');
    } else {
        log('✓ .env.production 存在', 'green');
    }

    log('');
}

// 清理旧的构建
function cleanBuild() {
    log('清理旧的构建...', 'blue');
    const dirs = [
        path.join(__dirname, '..', '.next'),
        path.join(__dirname, '..', 'release'),
        path.join(__dirname, '..', '.next', 'out'),
    ];

    dirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, {recursive: true, force: true});
            log(`  - 已清理：${path.basename(dir)}`, 'cyan');
        }
    });
    log('');
}

// 安装依赖
function installDependencies() {
    log('安装依赖...', 'blue');
    exec('npm ci --prefer-offline');
    log('✓ 依赖安装完成\n', 'green');
}

// 构建 Next.js
function buildNextJS() {
    log('构建 Next.js...', 'blue');
    exec('npm run build');
    log('✓ Next.js 构建完成\n', 'green');
}

// 构建 Electron
function buildElectron(platform) {
    if (!platform || platform === 'electron') {
        log('构建 Electron 应用...', 'blue');

        const targets = [];
        if (process.platform === 'win32') {
            targets.push('electron:build:win');
        } else if (process.platform === 'darwin') {
            targets.push('electron:build:mac');
        } else {
            targets.push('electron:build:linux');
        }

        exec(`npm run ${targets[0]}`);
        log('✓ Electron 构建完成\n', 'green');
    }
}

// 构建 Capacitor
function buildCapacitor(platform) {
    if (platform && ['android', 'ios'].includes(platform)) {
        log(`构建 Capacitor (${platform})...`, 'blue');
        exec(`node scripts/build-capacitor.js --${platform} --sync`);
        log('✓ Capacitor 构建完成\n', 'green');
    }
}

// 显示构建统计
function showBuildStats() {
    log('========================================', 'bright');
    log('  构建统计', 'bright');
    log('========================================', 'bright');

    const nextDir = path.join(__dirname, '..', '.next');
    if (fs.existsSync(nextDir)) {
        const size = getDirectorySize(nextDir);
        log(`Next.js 构建大小：${formatBytes(size)}`, 'cyan');
    }

    const releaseDir = path.join(__dirname, '..', 'release');
    if (fs.existsSync(releaseDir)) {
        const files = fs.readdirSync(releaseDir);
        log(`Electron 安装包数量：${files.length}`, 'cyan');
        files.forEach(file => {
            const filePath = path.join(releaseDir, file);
            const stats = fs.statSync(filePath);
            log(`  - ${file} (${formatBytes(stats.size)})`, 'cyan');
        });
    }

    log('');
}

// 计算目录大小
function getDirectorySize(dir) {
    let size = 0;
    try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                size += getDirectorySize(itemPath);
            } else {
                size += stats.size;
            }
        });
    } catch (error) {
        // 忽略错误
    }
    return size;
}

// 格式化字节
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    const platform = args.find(arg => ['--electron', '--android', '--ios'].includes(arg));
    const skipClean = args.includes('--skip-clean');
    const skipInstall = args.includes('--skip-install');

    log('========================================', 'bright');
    log('  zDrink POS - 生产环境构建工具', 'bright');
    log('========================================', 'bright');
    log('');
    log(`目标平台：${platform || '自动检测'}`, 'blue');
    log(`跳过清理：${skipClean ? '是' : '否'}`, 'blue');
    log(`跳过安装：${skipInstall ? '是' : '否'}`, 'blue');
    log('');

    try {
        // 检查环境
        checkEnvironment();

        // 清理
        if (!skipClean) {
            cleanBuild();
        }

        // 安装依赖
        if (!skipInstall) {
            installDependencies();
        }

        // 构建 Next.js
        buildNextJS();

        // 构建 Electron
        if (!platform || platform === 'electron') {
            buildElectron(platform);
        }

        // 构建移动端
        if (platform === 'android' || platform === 'ios') {
            buildCapacitor(platform);
        }

        // 显示统计
        showBuildStats();

        log('========================================', 'bright');
        log('  ✓ 构建成功！', 'green');
        log('========================================', 'bright');
        log('');
        log('构建产物位置:', 'blue');
        log('  Web 应用：frontend-v2/.next/standalone', 'bright');
        log('  Electron: frontend-v2/release/', 'bright');
        if (platform === 'android') {
            log('  Android: frontend-v2/android/app/build/outputs/apk/', 'bright');
        }
        if (platform === 'ios') {
            log('  iOS: frontend-v2/ios/App/build/', 'bright');
        }
        log('');
        log('下一步操作:', 'blue');
        if (!platform || platform === 'electron') {
            log('  Electron 安装包在 release/ 目录，可以分发给用户', 'bright');
        }
        if (platform === 'android') {
            log('  Android APK 需要签名后才能发布到应用商店', 'bright');
        }
        if (platform === 'ios') {
            log('  iOS IPA 需要使用 Xcode 签名后发布', 'bright');
        }
        log('');

    } catch (error) {
        log('\n✗ 构建失败，请检查错误信息', 'red');
        process.exit(1);
    }
}

main();
