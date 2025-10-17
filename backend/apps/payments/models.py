import uuid
from datetime import time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

User = get_user_model()


class PaymentMethod(models.Model):
    """支付方式配置"""
    PAYMENT_CHOICES = (
        ('wechat', '微信支付'),
        ('alipay', '支付宝'),
        ('cash', '现金'),
        ('card', '银行卡'),
        ('balance', '余额支付'),
        ('points', '积分支付'),
    )

    name = models.CharField(max_length=50, verbose_name='支付方式名称')
    code = models.CharField(max_length=20, choices=PAYMENT_CHOICES, verbose_name='支付代码')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    # 支付配置（存储API密钥等敏感信息）
    config = models.JSONField(default=dict, verbose_name='支付配置')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='shop_payment_methods')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_methods'
        verbose_name = '支付方式'
        verbose_name_plural = '支付方式'
        unique_together = ['shop', 'code']

    def __str__(self):
        return f"{self.name} - {self.shop.name}"


class PaymentTransaction(models.Model):
    """支付交易记录"""
    STATUS_CHOICES = (
        ('pending', '待支付'),
        ('paid', '支付成功'),
        ('failed', '支付失败'),
        ('refunded', '已退款'),
        ('cancelled', '已取消'),
    )

    # 交易信息
    transaction_no = models.CharField(max_length=64, unique=True, verbose_name='交易号')
    out_trade_no = models.CharField(max_length=64, verbose_name='商户订单号')

    # 关联订单
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='payment_transactions')

    # 支付信息
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='支付金额'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # 第三方支付信息
    thirdparty_trade_no = models.CharField(max_length=64, blank=True, verbose_name='第三方交易号')
    payment_data = models.JSONField(default=dict, verbose_name='支付数据')

    # 退款信息
    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='退款金额'
    )
    refund_data = models.JSONField(default=dict, verbose_name='退款数据')

    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')
    refunded_at = models.DateTimeField(null=True, blank=True, verbose_name='退款时间')

    class Meta:
        db_table = 'payment_transactions'
        verbose_name = '支付交易'
        verbose_name_plural = '支付交易'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_no} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.transaction_no:
            self.transaction_no = self.generate_transaction_no()
        super().save(*args, **kwargs)

    def generate_transaction_no(self):
        return f"T{int(time.time())}{uuid.uuid4().hex[:8].upper()}"


class RefundRequest(models.Model):
    """退款申请"""
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('approved', '已同意'),
        ('rejected', '已拒绝'),
        ('completed', '已完成'),
    )

    refund_no = models.CharField(max_length=64, unique=True, verbose_name='退款单号')
    transaction = models.ForeignKey(PaymentTransaction, on_delete=models.CASCADE, related_name='refunds')
    refund_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='退款金额'
    )
    reason = models.TextField(verbose_name='退款原因')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # 处理信息
    handled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    handled_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, verbose_name='拒绝原因')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'refund_requests'
        verbose_name = '退款申请'
        verbose_name_plural = '退款申请'

    def __str__(self):
        return f"Refund {self.refund_no}"

    def save(self, *args, **kwargs):
        if not self.refund_no:
            self.refund_no = f"R{int(time.time())}{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class WechatPayConfig(models.Model):
    """微信支付配置"""
    shop = models.OneToOneField('shops.Shop', on_delete=models.CASCADE, related_name='wechat_pay_config')

    # 基础配置
    app_id = models.CharField(max_length=64, verbose_name='AppID')
    mch_id = models.CharField(max_length=32, verbose_name='商户号')
    api_key = models.CharField(max_length=128, verbose_name='API密钥')

    # 证书路径
    cert_path = models.CharField(max_length=255, blank=True, verbose_name='证书路径')
    key_path = models.CharField(max_length=255, blank=True, verbose_name='密钥路径')

    # 支付场景
    enable_jsapi = models.BooleanField(default=True, verbose_name='启用JSAPI支付')
    enable_miniprogram = models.BooleanField(default=True, verbose_name='启用小程序支付')
    enable_native = models.BooleanField(default=True, verbose_name='启用扫码支付')

    # 回调配置
    notify_url = models.CharField(max_length=255, blank=True, verbose_name='支付回调地址')
    refund_notify_url = models.CharField(max_length=255, blank=True, verbose_name='退款回调地址')

    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wechat_pay_configs'
        verbose_name = '微信支付配置'
        verbose_name_plural = '微信支付配置'

    def __str__(self):
        return f"微信支付 - {self.shop.name}"


class AlipayConfig(models.Model):
    """支付宝配置"""
    shop = models.OneToOneField('shops.Shop', on_delete=models.CASCADE, related_name='alipay_config')

    # 基础配置
    app_id = models.CharField(max_length=32, verbose_name='AppID')
    app_private_key = models.TextField(verbose_name='应用私钥')
    alipay_public_key = models.TextField(verbose_name='支付宝公钥')

    # 支付场景
    enable_app = models.BooleanField(default=True, verbose_name='启用APP支付')
    enable_wap = models.BooleanField(default=True, verbose_name='启用手机网站支付')
    enable_pc = models.BooleanField(default=True, verbose_name='启用电脑网站支付')

    # 回调配置
    notify_url = models.CharField(max_length=255, blank=True, verbose_name='支付回调地址')
    return_url = models.CharField(max_length=255, blank=True, verbose_name='返回地址')

    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alipay_configs'
        verbose_name = '支付宝配置'
        verbose_name_plural = '支付宝配置'

    def __str__(self):
        return f"支付宝 - {self.shop.name}"
