from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    CategoryViewSet, ProductViewSet, SpecificationViewSet,
    ProductSKUViewSet, InventoryLogView, bulk_stock_update,
    low_stock_alert, public_products
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'specifications', SpecificationViewSet)
router.register(r'skus', ProductSKUViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('inventory/logs/', InventoryLogView.as_view(), name='inventory-logs'),
    path('inventory/bulk-update/', bulk_stock_update, name='bulk-stock-update'),
    path('inventory/low-stock-alert/', low_stock_alert, name='low-stock-alert'),
    path('public/products/', public_products, name='public-products'),
]