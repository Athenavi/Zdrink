#!/usr/bin/env node

/**
 * 环境配置检查脚本
 * 验证环境变量是否正确配置
 */

const fs = require('fs');
const path = require('path');

// 颜色代码
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

console.log(`${colors.cyan}🔍 开始检查环境配置...${colors.reset}\n`);

// 必需的环境变量
const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
];

// 可选但推荐的环境变量
const recommendedEnvVars = [
    'NEXT_PUBLIC_DEFAULT_TENANT',
    'NEXT_PUBLIC_WS_URL',
];

// 安全相关的检查
const securityChecks = [
    {
        var: 'NEXTAUTH_SECRET',
        test: (value) => value && value.length >= 32,
        message: 'NEXTAUTH_SECRET 长度应该至少为 32 个字符',
    },
    {
        var: 'NEXT_PUBLIC_API_URL',
        test: (value) => {
            if (process.env.NODE_ENV === 'production') {
                return value.startsWith('https://');
            }
            return true;
        },
        message: '生产环境必须使用 HTTPS 协议',
    },
];

let hasError = false;
let warnings = 0;

// 检查 .env 文件
const envFiles = ['.env.local', '.env.development', '.env.production', '.env.test'];
const existingEnvFiles = envFiles.filter(file => fs.existsSync(path.join(process.cwd(), file)));

if (existingEnvFiles.length === 0) {
    console.error(`${colors.red}❌ 未找到任何环境配置文件${colors.reset}`);
    console.log(`💡 请创建 .env.local 文件或从 .env.example 复制\n`);
    hasError = true;
} else {
    console.log(`${colors.green}✅ 找到环境配置文件:${colors.reset}`);
    existingEnvFiles.forEach(file => console.log(`   - ${file}`));
    console.log();
}

// 加载环境变量（简单的解析）
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};

    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};

    content.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // 移除引号
            value = value.replace(/^["']|["']$/g, '');
            env[key] = value;
        }
    });

    return env;
}

// 合并所有环境文件（优先级：.env.local > .env.development > .env.example）
const allEnv = {};
['.env.example', '.env.development', '.env.local'].forEach(file => {
    Object.assign(allEnv, loadEnvFile(path.join(process.cwd(), file)));
});

// 检查必需的环境变量
console.log(`${colors.blue}=== 检查必需的环境变量 ===${colors.reset}\n`);

requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar] || allEnv[envVar];

    if (!value) {
        console.error(`${colors.red}❌ 缺少必需的环境变量：${envVar}${colors.reset}`);
        hasError = true;
    } else if (value.includes('your-') || value.includes('change-in-production')) {
        console.warn(`${colors.yellow}⚠️  ${envVar} 使用默认值，请修改为实际值${colors.reset}`);
        warnings++;
    } else {
        console.log(`${colors.green}✅ ${envVar}: 已配置${colors.reset}`);
    }
});

console.log();

// 检查推荐的环境变量
console.log(`${colors.blue}=== 检查推荐的环境变量 ===${colors.reset}\n`);

recommendedEnvVars.forEach(envVar => {
    const value = process.env[envVar] || allEnv[envVar];

    if (!value) {
        console.warn(`${colors.yellow}⚠️  推荐配置：${envVar} (可选)${colors.reset}`);
        warnings++;
    } else {
        console.log(`${colors.green}✅ ${envVar}: 已配置${colors.reset}`);
    }
});

console.log();

// 安全检查
console.log(`${colors.blue}=== 安全检查 ===${colors.reset}\n`);

securityChecks.forEach(check => {
    const value = process.env[check.var] || allEnv[check.var];

    if (!check.test(value)) {
        console.error(`${colors.red}❌ ${check.message}${colors.reset}`);
        hasError = true;
    } else {
        console.log(`${colors.green}✅ ${check.var}: 通过安全检查${colors.reset}`);
    }
});

console.log();

// 环境特定检查
console.log(`${colors.blue}=== 环境特定检查 ===${colors.reset}\n`);

const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`当前环境：${colors.cyan}${nodeEnv}${colors.reset}\n`);

if (nodeEnv === 'production') {
    // 生产环境检查
    const apiurl = process.env.NEXT_PUBLIC_API_URL || allEnv.NEXT_PUBLIC_API_URL;
    if (!apiurl?.startsWith('https://')) {
        console.error(`${colors.red}❌ 生产环境 API 必须使用 HTTPS${colors.reset}`);
        hasError = true;
    } else {
        console.log(`${colors.green}✅ API URL 使用 HTTPS${colors.reset}`);
    }

    const debugEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG || allEnv.NEXT_PUBLIC_ENABLE_DEBUG;
    if (debugEnabled === 'true') {
        console.warn(`${colors.yellow}⚠️  生产环境不应启用 DEBUG${colors.reset}`);
        warnings++;
    } else {
        console.log(`${colors.green}✅ DEBUG 已禁用${colors.reset}`);
    }
} else if (nodeEnv === 'development') {
    // 开发环境检查
    console.log(`${colors.green}✅ 开发环境配置正常${colors.reset}`);
    console.log(`💡 提示：可以使用 localhost 和 HTTP 协议\n`);
}

// 总结
console.log(`${colors.blue}=== 检查总结 ===${colors.reset}\n`);

if (hasError) {
    console.error(`${colors.red}❌ 发现错误，请修复后再继续${colors.reset}`);
    process.exit(1);
} else if (warnings > 0) {
    console.warn(`${colors.yellow}⚠️  发现 ${warnings} 个警告，建议检查${colors.reset}`);
} else {
    console.log(`${colors.green}✅ 所有检查通过！${colors.reset}`);
}

console.log();
