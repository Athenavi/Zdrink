from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('super_admin', '超级管理员'),
        ('shop_owner', '店铺所有者'),
        ('shop_staff', '店铺员工'),
        ('customer', '顾客'),
    )

    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='customer')
    phone = models.CharField(max_length=15, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    points = models.IntegerField(default=0)

    # 会员相关字段
    MEMBERSHIP_LEVEL_CHOICES = (
        ('regular', '普通会员'),
        ('silver', '银卡会员'),
        ('gold', '金卡会员'),
        ('platinum', '白金会员'),
        ('diamond', '钻石会员'),
    )

    membership_level = models.CharField(
        max_length=20,
        choices=MEMBERSHIP_LEVEL_CHOICES,
        default='regular',
        verbose_name='会员等级'
    )
    membership_number = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name='会员卡号')
    membership_expiry = models.DateTimeField(null=True, blank=True, verbose_name='会员到期时间')

    # 积分相关
    total_points = models.IntegerField(default=0, verbose_name='累计积分')
    available_points = models.IntegerField(default=0, verbose_name='可用积分')
    used_points = models.IntegerField(default=0, verbose_name='已用积分')

    # 消费统计
    total_consumption = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='总消费金额')
    consumption_count = models.IntegerField(default=0, verbose_name='消费次数')

    # 推荐相关
    referrer = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals',
                                 verbose_name='推荐人')
    referral_code = models.CharField(max_length=20, unique=True, blank=True, null=True, verbose_name='推荐码')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def save(self, *args, **kwargs):
        if not self.membership_number:
            self.membership_number = self.generate_membership_number()
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)

    def generate_membership_number(self):
        import random
        return f"M{self.id:08d}{random.randint(1000, 9999)}"

    def generate_referral_code(self):
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


def get_anonymous_user_instance():
    """获取匿名用户实例（用于Guardian）"""
    from django.contrib.auth.models import AnonymousUser
    return AnonymousUser()


class MembershipLevelConfig(models.Model):
    """会员等级配置"""
    level = models.CharField(max_length=20, choices=User.MEMBERSHIP_LEVEL_CHOICES, verbose_name='等级')
    name = models.CharField(max_length=50, verbose_name='等级名称')
    min_points = models.IntegerField(default=0, verbose_name='升级所需积分')
    discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('1.00'))],
        verbose_name='折扣率'
    )
    points_earn_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.1,
        verbose_name='积分获取比例'
    )
    benefits = models.JSONField(default=dict, verbose_name='会员权益')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='membership_levels')

    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'membership_level_configs'
        verbose_name = '会员等级配置'
        verbose_name_plural = '会员等级配置'
        unique_together = ['shop', 'level']

    def __str__(self):
        return f"{self.name} - {self.shop.name}"


class PointsLog(models.Model):
    """积分记录"""
    POINTS_TYPE_CHOICES = (
        ('earn_order', '消费获得'),
        ('earn_signin', '签到获得'),
        ('earn_share', '分享获得'),
        ('earn_referral', '推荐获得'),
        ('consume_order', '消费抵扣'),
        ('consume_gift', '兑换礼品'),
        ('expire', '积分过期'),
        ('adjust', '人工调整'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='points_logs')
    points_type = models.CharField(max_length=20, choices=POINTS_TYPE_CHOICES, verbose_name='积分类型')
    points = models.IntegerField(verbose_name='积分变化')
    current_points = models.IntegerField(verbose_name='当前积分')
    notes = models.TextField(blank=True, verbose_name='备注')
    reference_id = models.CharField(max_length=100, blank=True, verbose_name='关联单据ID')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='points_logs')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'points_logs'
        verbose_name = '积分记录'
        verbose_name_plural = '积分记录'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.points_type} - {self.points}"


class PointsRule(models.Model):
    """积分规则"""
    RULE_TYPE_CHOICES = (
        ('order_earn', '消费获得积分'),
        ('signin_earn', '签到获得积分'),
        ('share_earn', '分享获得积分'),
        ('referral_earn', '推荐获得积分'),
        ('points_expire', '积分过期规则'),
    )

    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES, verbose_name='规则类型')
    name = models.CharField(max_length=100, verbose_name='规则名称')
    description = models.TextField(blank=True, verbose_name='规则描述')

    # 规则配置
    config = models.JSONField(default=dict, verbose_name='规则配置')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='points_rules')

    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'points_rules'
        verbose_name = '积分规则'
        verbose_name_plural = '积分规则'
        unique_together = ['shop', 'rule_type']

    def __str__(self):
        return f"{self.name} - {self.shop.name}"


class MemberRecharge(models.Model):
    """会员充值"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recharges')
    recharge_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='充值金额')
    gift_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='赠送金额')
    gift_points = models.IntegerField(default=0, verbose_name='赠送积分')

    # 支付信息
    payment_method = models.CharField(max_length=50, verbose_name='支付方式')
    payment_status = models.BooleanField(default=False, verbose_name='支付状态')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='member_recharges')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'member_recharges'
        verbose_name = '会员充值'
        verbose_name_plural = '会员充值'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.recharge_amount}"