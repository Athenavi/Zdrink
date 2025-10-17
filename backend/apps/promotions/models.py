from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

User = get_user_model()


class Coupon(models.Model):
    """优惠券"""
    COUPON_TYPE_CHOICES = (
        ('fixed', '固定金额'),
        ('percentage', '百分比'),
        ('shipping', '免运费'),
    )

    APPLY_TO_CHOICES = (
        ('all', '全部商品'),
        ('category', '指定分类'),
        ('product', '指定商品'),
    )

    name = models.CharField(max_length=100, verbose_name='优惠券名称')
    code = models.CharField(max_length=50, unique=True, verbose_name='优惠券代码')
    coupon_type = models.CharField(max_length=20, choices=COUPON_TYPE_CHOICES, default='fixed')

    # 优惠金额或比例
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='优惠值'
    )
    max_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='最大折扣金额'
    )

    # 使用条件
    min_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='最低订单金额'
    )
    apply_to = models.CharField(max_length=20, choices=APPLY_TO_CHOICES, default='all')
    apply_to_ids = models.JSONField(default=list, blank=True, verbose_name='适用范围ID列表')

    # 发行和有效期
    total_quantity = models.IntegerField(verbose_name='发行总量')
    used_quantity = models.IntegerField(default=0, verbose_name='已使用数量')
    valid_from = models.DateTimeField(verbose_name='生效时间')
    valid_until = models.DateTimeField(verbose_name='过期时间')

    # 使用限制
    limit_per_user = models.IntegerField(default=1, verbose_name='每人限领数量')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='coupons')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'promotions'
        db_table = 'promotions_coupon'
        verbose_name = '优惠券'
        verbose_name_plural = '优惠券'

    def __str__(self):
        return f"{self.name} - {self.code}"

    @property
    def is_available(self):
        """检查优惠券是否可用"""
        from django.utils import timezone
        now = timezone.now()
        return (
                self.is_active and
                self.used_quantity < self.total_quantity and
                self.valid_from <= now <= self.valid_until
        )


class UserCoupon(models.Model):
    """用户优惠券"""
    STATUS_CHOICES = (
        ('available', '可用'),
        ('used', '已使用'),
        ('expired', '已过期'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_coupons')
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='user_coupons')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    # 使用信息
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='使用时间')
    used_in_order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_coupons'
        app_label = 'promotions'
        verbose_name = '用户优惠券'
        verbose_name_plural = '用户优惠券'
        unique_together = ['user', 'coupon']

    def __str__(self):
        return f"{self.user.username} - {self.coupon.name}"


class CouponRule(models.Model):
    """优惠券发放规则"""
    RULE_TYPE_CHOICES = (
        ('auto_register', '注册自动发放'),
        ('first_order', '首单完成后发放'),
        ('birthday', '生日发放'),
        ('manual', '手动发放'),
    )

    name = models.CharField(max_length=100, verbose_name='规则名称')
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES, verbose_name='规则类型')
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='rules')

    # 规则配置
    config = models.JSONField(default=dict, verbose_name='规则配置')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='coupon_rules')

    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'coupon_rules'
        app_label = 'promotions'
        verbose_name = '优惠券发放规则'
        verbose_name_plural = '优惠券发放规则'

    def __str__(self):
        return f"{self.name} - {self.coupon.name}"


class Promotion(models.Model):
    """促销活动"""
    PROMOTION_TYPE_CHOICES = (
        ('discount', '折扣'),
        ('gift', '赠品'),
        ('combo', '套餐'),
        ('flash_sale', '限时抢购'),
    )

    name = models.CharField(max_length=100, verbose_name='促销名称')
    promotion_type = models.CharField(max_length=20, choices=PROMOTION_TYPE_CHOICES)
    description = models.TextField(blank=True, verbose_name='活动描述')

    # 活动条件
    condition_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='条件金额'
    )
    condition_quantity = models.IntegerField(null=True, blank=True, verbose_name='条件数量')

    # 优惠内容
    discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('1.00'))],
        verbose_name='折扣率'
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='折扣金额'
    )
    gift_product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='赠品'
    )
    gift_quantity = models.IntegerField(default=1, verbose_name='赠品数量')

    # 适用范围
    apply_to_products = models.ManyToManyField(
        'products.Product',
        blank=True,
        verbose_name='适用商品'
    )
    apply_to_categories = models.ManyToManyField(
        'products.Category',
        blank=True,
        verbose_name='适用分类'
    )

    # 有效期
    valid_from = models.DateTimeField(verbose_name='生效时间')
    valid_until = models.DateTimeField(verbose_name='过期时间')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='promotions')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotions'
        app_label = 'promotions'
        verbose_name = '促销活动'
        verbose_name_plural = '促销活动'

    def __str__(self):
        return self.name

    @property
    def is_valid(self):
        """检查促销是否有效"""
        from django.utils import timezone
        now = timezone.now()
        return self.is_active and self.valid_from <= now <= self.valid_until