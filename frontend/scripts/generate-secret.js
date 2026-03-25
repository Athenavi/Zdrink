#!/usr/bin/env node

/**
 * 生成安全的 NextAuth Secret
 * 用于生产环境配置
 */

const crypto = require('crypto');

// 生成 32 字节的随机字符串
const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 生成的 NEXTAUTH_SECRET:\n');
console.log(secret);
console.log('\n📝 请将此值添加到你的 .env.production 文件中:\n');
console.log(`NEXTAUTH_SECRET=${secret}\n`);
