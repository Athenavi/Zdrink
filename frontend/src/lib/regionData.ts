/**
 * 地区数据加载工具
 * 通过 API 按需加载省市区数据
 */

// 缓存已加载的数据，避免重复请求
interface RegionItem {
    code: string;
    name: string;
}

const cache = new Map<string, RegionItem[]>();

/**
 * 加载省份列表
 */
export async function loadProvinces() {
    if (cache.has('provinces')) {
        console.log('[RegionData] 从缓存加载省份数据');
        return cache.get('provinces');
    }

    try {
        console.log('[RegionData] 从 API 加载省份数据...');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/regions/provinces/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[RegionData] 成功加载 ${data.provinces.length} 个省份`);
        cache.set('provinces', data.provinces);
        return data.provinces;
    } catch (error) {
        console.error('[RegionData] 加载省份数据失败:', error);
        return [];
    }
}

/**
 * 加载指定省份的城市列表
 * @param provinceCode 省份代码，如 '440000'
 */
export async function loadCities(provinceCode: string) {
    const cacheKey = `cities_${provinceCode}`;

    if (cache.has(cacheKey)) {
        console.log(`[RegionData] 从缓存加载城市数据: ${provinceCode}`);
        return cache.get(cacheKey);
    }

    try {
        console.log(`[RegionData] 从 API 加载城市数据: ${provinceCode}...`);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/regions/cities/${provinceCode}/`);

        if (!response.ok) {
            console.warn(`[RegionData] 城市数据不存在: ${provinceCode}，使用默认值`);
            // 如果文件不存在，返回默认的市辖区
            return [{code: `${provinceCode.substring(0, 4)}00`, name: '市辖区'}];
        }

        const data = await response.json();
        console.log(`[RegionData] 成功加载 ${data.length} 个城市`);
        cache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error(`[RegionData] 加载城市数据失败 (省份: ${provinceCode}):`, error);
        // 返回默认的市辖区
        return [{code: `${provinceCode.substring(0, 4)}00`, name: '市辖区'}];
    }
}

/**
 * 加载指定城市的区县列表
 * @param cityCode 城市代码，如 '440300'
 */
export async function loadDistricts(cityCode: string) {
    const cacheKey = `districts_${cityCode}`;

    if (cache.has(cacheKey)) {
        console.log(`[RegionData] 从缓存加载区县数据: ${cityCode}`);
        return cache.get(cacheKey);
    }

    try {
        console.log(`[RegionData] 从 API 加载区县数据: ${cityCode}...`);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/regions/districts/${cityCode}/`);

        if (!response.ok) {
            console.warn(`[RegionData] 区县数据不存在: ${cityCode}，使用默认值`);
            // 如果文件不存在，返回默认区县
            return [
                {code: '001', name: '默认区'},
                {code: '002', name: '其他区'}
            ];
        }

        const data = await response.json();
        console.log(`[RegionData] 成功加载 ${data.length} 个区县`);
        cache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error(`[RegionData] 加载区县数据失败 (城市: ${cityCode}):`, error);
        // 返回默认区县
        return [
            {code: '001', name: '默认区'},
            {code: '002', name: '其他区'}
        ];
    }
}

/**
 * 清除缓存
 */
export function clearCache() {
    cache.clear();
}

/**
 * 获取缓存大小
 */
export function getCacheSize() {
    return cache.size;
}
