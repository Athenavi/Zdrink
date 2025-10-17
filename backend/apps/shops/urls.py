from django.urls import path

from .api import (
    ShopListView,
    ShopDetailView,
    ShopStaffListView,
    ShopSettingsView,
    get_current_shop
)

urlpatterns = [
    path('', ShopListView.as_view(), name='shop-list'),
    path('current/', get_current_shop, name='current-shops'),
    path('<int:pk>/', ShopDetailView.as_view(), name='shop-detail'),
    path('<int:shop_id>/staff/', ShopStaffListView.as_view(), name='shop-staff-list'),
    path('<int:shop_id>/settings/', ShopSettingsView.as_view(), name='shop-settings'),
]