"""
地区数据 API 视图
提供省市区三级联动数据
"""

import json
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET

# 获取 regions 目录的绝对路径
REGIONS_DIR = Path(settings.MEDIA_ROOT) / 'regions'


# 缓存5分钟
@cache_page(5 * 60)
@require_GET
def get_provinces(request):
    """获取省份列表"""
    try:
        provinces_file = REGIONS_DIR / 'provinces.json'

        if not provinces_file.exists():
            return JsonResponse({'error': '省份数据文件不存在'}, status=404)

        with open(provinces_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@cache_page(5 * 60)
@require_GET
def get_cities(request, province_code):
    """获取指定省份的城市列表"""
    try:
        cities_dir = REGIONS_DIR / 'cities'
        cities_file = cities_dir / f'{province_code}.json'

        if not cities_file.exists():
            # 返回默认的市辖区
            return JsonResponse([
                {"code": f"{province_code[:4]}00", "name": "市辖区"}
            ], safe=False)

        with open(cities_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@cache_page(5 * 60)
@require_GET
def get_districts(request, city_code):
    """获取指定城市的区县列表"""
    try:
        districts_dir = REGIONS_DIR / 'districts'
        districts_file = districts_dir / f'{city_code}.json'

        if not districts_file.exists():
            # 返回默认区县
            return JsonResponse([
                {"code": "001", "name": "默认区"},
                {"code": "002", "name": "其他区"}
            ], safe=False)

        with open(districts_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
