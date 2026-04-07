from django.urls import path

from . import views

urlpatterns = [
    # 地区数据 API
    path('regions/provinces/', views.get_provinces, name='get-provinces'),
    path('regions/cities/<str:province_code>/', views.get_cities, name='get-cities'),
    path('regions/districts/<str:city_code>/', views.get_districts, name='get-districts'),
]