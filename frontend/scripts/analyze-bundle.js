#!/usr/bin/env node

/**
 * 构建分析脚本
 * 分析打包后的 bundle 大小和组成
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Next.js 输出目录
const BUILD_DIR = path.join(process.cwd(), '.next');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

// 颜色代码
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

console.log(`${colors.cyan}📦 开始分析构建结果...${colors.reset}\n`);

// 检查构建目录是否存在
if (!fs.existsSync(BUILD_DIR)) {
    console.error(`${colors.red}错误：未找到构建目录，请先运行 npm run build${colors.reset}`);
    process.exit(1);
}

// 递归获取所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}

// 计算文件大小（压缩后）
function getFileSize(filePath) {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return {
        raw: content.length,
        gzipped: gzipped.length,
    };
}

// 格式化字节数
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 分析 chunk 文件
const chunkFiles = getAllFiles(path.join(STATIC_DIR, 'chunks'))
    .filter(file => file.endsWith('.js'));

// 分析页面文件
const pageFiles = getAllFiles(path.join(STATIC_DIR, 'chunks', 'pages'))
    .filter(file => file.endsWith('.js'));

// 统计数据
let totalRawSize = 0;
let totalGzippedSize = 0;

console.log(`${colors.blue}=== Chunk 文件分析 ===${colors.reset}\n`);

const chunkStats = chunkFiles.map(file => {
    const relativePath = path.relative(process.cwd(), file);
    const sizes = getFileSize(file);
    totalRawSize += sizes.raw;
    totalGzippedSize += sizes.gzipped;

    return {
        path: relativePath,
        raw: sizes.raw,
        gzipped: sizes.gzipped,
    };
});

// 按大小排序
chunkStats.sort((a, b) => b.gzipped - a.gzipped);

// 显示前 20 个最大的 chunk
chunkStats.slice(0, 20).forEach(stat => {
    const percentage = ((stat.gzipped / totalGzippedSize) * 100).toFixed(1);
    console.log(`${colors.yellow}${stat.path}${colors.reset}`);
    console.log(`  Raw: ${formatBytes(stat.raw)} | Gzipped: ${formatBytes(stat.gzipped)} (${percentage}%)`);
});

console.log(`\n${colors.green}总 Chunk 大小：${formatBytes(totalGzippedSize)} (gzip 压缩后)${colors.reset}`);

// 分析页面
console.log(`\n${colors.blue}=== 页面文件分析 ===${colors.reset}\n`);

const pageStats = pageFiles.map(file => {
    const relativePath = path.relative(process.cwd(), file);
    const sizes = getFileSize(file);

    return {
        path: relativePath,
        raw: sizes.raw,
        gzipped: sizes.gzipped,
    };
});

pageStats.sort((a, b) => b.gzipped - a.gzipped);

pageStats.forEach(stat => {
    console.log(`${colors.yellow}${stat.path}${colors.reset}`);
    console.log(`  Raw: ${formatBytes(stat.raw)} | Gzipped: ${formatBytes(stat.gzipped)}`);
});

// 总体统计
console.log(`\n${colors.blue}=== 总体统计 ===${colors.reset}`);
console.log(`Total Raw Size: ${formatBytes(totalRawSize)}`);
console.log(`Total Gzipped Size: ${formatBytes(totalGzippedSize)}`);
console.log(`Compression Ratio: ${((totalGzippedSize / totalRawSize) * 100).toFixed(1)}%`);

// Bundle 优化建议
console.log(`\n${colors.cyan}=== 优化建议 ===${colors.reset}`);

const largeChunks = chunkStats.filter(stat => stat.gzipped > 100 * 1024); // > 100KB
if (largeChunks.length > 0) {
    console.log(`${colors.yellow}⚠️  发现 ${largeChunks.length} 个较大的 chunk (>100KB):${colors.reset}`);
    largeChunks.forEach(stat => {
        console.log(`   - ${stat.path}: ${formatBytes(stat.gzipped)}`);
    });
    console.log(`   💡 考虑使用动态导入 (dynamic import) 进行代码分割\n`);
}

const vendorChunk = chunkStats.find(stat => stat.path.includes('vendors'));
if (vendorChunk && vendorChunk.gzipped > 500 * 1024) {
    console.log(`${colors.yellow}⚠️  Vendor 包过大 (${formatBytes(vendorChunk.gzipped)}):${colors.reset}`);
    console.log(`   💡 考虑移除未使用的依赖或使用更轻量的替代库\n`);
}

console.log(`${colors.green}✅ 分析完成！${colors.reset}\n`);
