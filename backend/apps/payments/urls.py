from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    PaymentMethodViewSet, PaymentTransactionViewSet, RefundRequestViewSet,
    wechat_pay_callback, alipay_callback, WechatPayConfigView,
    AlipayConfigView, payment_statistics
)

router = DefaultRouter()
router.register(r'methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'transactions', PaymentTransactionViewSet, basename='payment-transaction')
router.register(r'refunds', RefundRequestViewSet, basename='refund-request')

urlpatterns = [
    path('', include(router.urls)),
    path('callback/wechat/', wechat_pay_callback, name='wechat-pay-callback'),
    path('callback/alipay/', alipay_callback, name='alipay-callback'),
    path('config/wechat/', WechatPayConfigView.as_view(), name='wechat-pay-config'),
    path('config/alipay/', AlipayConfigView.as_view(), name='alipay-config'),
    path('statistics/', payment_statistics, name='payment-statistics'),
]