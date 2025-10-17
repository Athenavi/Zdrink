from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import POSViewSet, TableManagementViewSet, pos_dashboard, pos_statistics, start_cashier_shift, \
    end_cashier_shift

router = DefaultRouter()
router.register(r'pos', POSViewSet, basename='pos')
router.register(r'tables', TableManagementViewSet, basename='table-management')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', pos_dashboard, name='pos-dashboard'),
    path('statistics/', pos_statistics, name='pos-statistics'),
    path('shift/start/', start_cashier_shift, name='start-cashier-shift'),
    path('shift/end/', end_cashier_shift, name='end-cashier-shift'),
]