"""
地区数据生成脚本
从 pca.json 生成按省市拆分的独立 JSON 文件到后端 media 目录
"""

import json
from pathlib import Path

# 省份代码映射表（基于国家统计局标准）
PROVINCE_CODES = {
    '北京市': '110000',
    '天津市': '120000',
    '河北省': '130000',
    '山西省': '140000',
    '内蒙古自治区': '150000',
    '辽宁省': '210000',
    '吉林省': '220000',
    '黑龙江省': '230000',
    '上海市': '310000',
    '江苏省': '320000',
    '浙江省': '330000',
    '安徽省': '340000',
    '福建省': '350000',
    '江西省': '360000',
    '山东省': '370000',
    '河南省': '410000',
    '湖北省': '420000',
    '湖南省': '430000',
    '广东省': '440000',
    '广西壮族自治区': '450000',
    '海南省': '460000',
    '重庆市': '500000',
    '四川省': '510000',
    '贵州省': '520000',
    '云南省': '530000',
    '西藏自治区': '540000',
    '陕西省': '610000',
    '甘肃省': '620000',
    '青海省': '630000',
    '宁夏回族自治区': '640000',
    '新疆维吾尔自治区': '650000'
}


def generate_city_code(province_code, index):
    """生成城市代码"""
    prefix = province_code[:2]
    city_index = index + 1
    return f"{prefix}{str(city_index).zfill(2)}00"


def generate_district_code(city_code, index):
    """生成区县代码"""
    prefix = city_code[:4]
    district_index = index + 1
    return f"{prefix}{str(district_index).zfill(2)}"


def generate_region_files():
    """生成地区数据文件"""
    print('开始生成地区数据文件...')

    # 读取 pca.json
    pca_path = Path(__file__).parent / 'pca.json'
    if not pca_path.exists():
        print('❌ pca.json 文件不存在，请先下载')
        return

    with open(pca_path, 'r', encoding='utf-8') as f:
        pca_data = json.load(f)

    # 输出目录（后端 media 目录）
    base_dir = Path(__file__).parent.parent / 'media' / 'regions'
    cities_dir = base_dir / 'cities'
    districts_dir = base_dir / 'districts'

    # 创建目录
    cities_dir.mkdir(parents=True, exist_ok=True)
    districts_dir.mkdir(parents=True, exist_ok=True)

    # 生成 provinces.json
    provinces = [
        {"code": code, "name": name}
        for name, code in PROVINCE_CODES.items()
    ]

    provinces_file = base_dir / 'provinces.json'
    with open(provinces_file, 'w', encoding='utf-8') as f:
        json.dump({"provinces": provinces}, f, ensure_ascii=False, indent=2)
    print('✓ 生成 provinces.json')

    # 遍历每个省份
    for province_name, cities in pca_data.items():
        province_code = PROVINCE_CODES.get(province_name)

        if not province_code:
            print(f'⚠ 未找到省份代码: {province_name}')
            continue

        # 生成城市列表
        city_list = [
            {
                "code": generate_city_code(province_code, idx),
                "name": city_name
            }
            for idx, city_name in enumerate(cities.keys())
        ]

        # 保存城市文件
        cities_file = cities_dir / f'{province_code}.json'
        with open(cities_file, 'w', encoding='utf-8') as f:
            json.dump(city_list, f, ensure_ascii=False, indent=2)
        print(f'✓ 生成 {province_name} 的城市数据 ({len(city_list)} 个城市)')

        # 为每个城市生成区县数据
        for idx, (city_name, districts) in enumerate(cities.items()):
            city_code = generate_city_code(province_code, idx)

            district_list = [
                {
                    "code": generate_district_code(city_code, dist_idx),
                    "name": district_name
                }
                for dist_idx, district_name in enumerate(districts)
            ]

            # 保存区县文件
            districts_file = districts_dir / f'{city_code}.json'
            with open(districts_file, 'w', encoding='utf-8') as f:
                json.dump(district_list, f, ensure_ascii=False, indent=2)

    print('\n✅ 所有地区数据文件生成完成！')
    print(f'📁 输出目录: {base_dir}')


if __name__ == '__main__':
    generate_region_files()
