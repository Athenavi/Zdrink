from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    PaymentMethodViewSet, PaymentTransactionViewSet, RefundRequestViewSet,
    wechat_pay_callback, alipay_callback, wechat_pay_config,
    alipay_config, payment_statistics
)

router = DefaultRouter()
router.register(r'methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'transactions', PaymentTransactionViewSet, basename='payment-transaction')
router.register(r'refunds', RefundRequestViewSet, basename='refund-request')

urlpatterns = [
    path('', include(router.urls)),
    path('callback/wechat/', wechat_pay_callback, name='wechat-pay-callback'),
    path('callback/alipay/', alipay_callback, name='alipay-callback'),
    path('config/wechat/', wechat_pay_config, name='wechat-pay-config'),
    path('config/alipay/', alipay_config, name='alipay-config'),
    path('statistics/', payment_statistics, name='payment-statistics'),
]