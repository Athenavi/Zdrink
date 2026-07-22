"""
地图与距离计算服务

提供两种距离计算方式：
1. Haversine 公式（根据经纬度直接计算球面距离，无需外部 API）
2. 高德地图 API（可选，配置 AMAP_API_KEY 后可提供驾车/步行等实际路线距离）
"""

import math
from typing import Optional

from django.conf import settings


def haversine_distance(
        lat1: float, lng1: float,
        lat2: float, lng2: float,
) -> float:
    """
    使用 Haversine 公式计算两点之间的球面距离。
    :returns: 距离（公里）
    """
    R = 6371.0  # 地球平均半径（公里）

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


class AMapService:
    """高德地图 API 服务（可选）"""

    def __init__(self):
        self.api_key = getattr(settings, 'AMAP_API_KEY', '')
        self.base_url = 'https://restapi.amap.com/v3'

    @property
    def is_available(self) -> bool:
        """API 是否已配置"""
        return bool(self.api_key)

    def get_driving_distance(
            self,
            origin_lat: float, origin_lng: float,
            dest_lat: float, dest_lng: float,
    ) -> Optional[float]:
        """
        获取驾车路线距离（公里）。
        如果 API 未配置或调用失败，返回 None。
        """
        if not self.is_available:
            return None

        try:
            import requests

            origin = f"{origin_lng},{origin_lat}"
            destination = f"{dest_lng},{dest_lat}"

            resp = requests.get(
                f"{self.base_url}/direction/driving",
                params={
                    'key': self.api_key,
                    'origin': origin,
                    'destination': destination,
                    'output': 'JSON',
                },
                timeout=5,
            )
            data = resp.json()

            if data.get('status') == '1' and data.get('route', {}).get('paths'):
                # 取第一条路径的距离（米），转为公里
                distance_m = int(data['route']['paths'][0]['distance'])
                return round(distance_m / 1000, 2)

        except Exception:
            pass

        return None

    def geocode(self, address: str, city: str = '') -> Optional[tuple[float, float]]:
        """
        地理编码：将地址字符串转为经纬度坐标。
        :returns: (lat, lng) 或 None
        """
        if not self.is_available:
            return None

        try:
            import requests

            params = {
                'key': self.api_key,
                'address': address,
                'output': 'JSON',
            }
            if city:
                params['city'] = city

            resp = requests.get(
                f"{self.base_url}/geocode/geo",
                params=params,
                timeout=5,
            )
            data = resp.json()

            if data.get('status') == '1' and data.get('geocodes'):
                location = data['geocodes'][0].get('location', '')
                if location:
                    lng, lat = location.split(',')
                    return (float(lat), float(lng))

        except Exception:
            pass

        return None


def calculate_distance(
        lat1: Optional[float], lng1: Optional[float],
        lat2: Optional[float], lng2: Optional[float],
        prefer_amap: bool = False,
) -> Optional[float]:
    """
    计算两点之间的距离（公里）。

    优先级：
    1. 如果 prefer_amap=True 且高德 API 可用，使用驾车路线距离。
    2. 否则使用 Haversine 公式计算球面距离。
    3. 任意坐标缺失时返回 None。
    """
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None

    lat1_f = float(lat1)
    lng1_f = float(lng1)
    lat2_f = float(lat2)
    lng2_f = float(lng2)

    if prefer_amap:
        amap = AMapService()
        distance = amap.get_driving_distance(lat1_f, lng1_f, lat2_f, lng2_f)
        if distance is not None:
            return distance

    return haversine_distance(lat1_f, lng1_f, lat2_f, lng2_f)
