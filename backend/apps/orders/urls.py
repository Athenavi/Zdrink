from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import CartViewSet, OrderViewSet, order_dashboard

router = DefaultRouter()
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', order_dashboard, name='order-dashboard'),
]