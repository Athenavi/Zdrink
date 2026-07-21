from django.urls import path

from .api import (
    ShopListView,
    ShopDetailView,
    ShopStaffListView,
    ShopSettingsView,
    get_current_shop,
    get_current_staff
)
from .apply_views import ShopApplyView

urlpatterns = [
    path('', ShopListView.as_view(), name='shop-list'),
    path('apply/', ShopApplyView.as_view(), name='shop-apply'),
    path('current/', get_current_shop, name='current-shops'),
    path('current/staff/', get_current_staff, name='current-staff'),
    path('current/settings/', ShopSettingsView.as_view(), name='current-settings'),
    path('<int:pk>/', ShopDetailView.as_view(), name='shop-detail'),
    path('<int:shop_id>/staff/', ShopStaffListView.as_view(), name='shop-staff-list'),
    path('<int:shop_id>/settings/', ShopSettingsView.as_view(), name='shop-settings'),
]