from django.contrib.auth import get_user_model
from django.db import models
from django_tenants.models import TenantMixin, DomainMixin

User = get_user_model()


class Shop(TenantMixin):
    name = models.CharField(max_length=100, verbose_name='店铺名称')
    description = models.TextField(blank=True, verbose_name='店铺描述')
    address = models.TextField(verbose_name='店铺地址')
    phone = models.CharField(max_length=20, blank=True, verbose_name='联系电话')
    email = models.EmailField(blank=True, verbose_name='联系邮箱')

    # 店铺类型
    SHOP_TYPE_CHOICES = (
        ('restaurant', '餐厅'),
        ('cafe', '咖啡厅'),
        ('bar', '酒吧'),
        ('bakery', '烘焙店'),
        ('other', '其他'),
    )
    shop_type = models.CharField(max_length=20, choices=SHOP_TYPE_CHOICES, default='restaurant')

    # 营业信息
    opening_hours = models.JSONField(default=dict, verbose_name='营业时间')
    is_active = models.BooleanField(default=True, verbose_name='是否营业')

    # 服务类型
    allow_delivery = models.BooleanField(default=True, verbose_name='允许外卖')
    allow_pickup = models.BooleanField(default=True, verbose_name='允许自取')
    allow_dine_in = models.BooleanField(default=True, verbose_name='允许堂食')

    # 配送信息
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='配送费')
    minimum_order_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='最低起送价')
    delivery_radius = models.IntegerField(default=5, verbose_name='配送半径(公里)')

    # 图片
    logo = models.ImageField(upload_to='shops/logo/', blank=True, null=True, verbose_name='店铺Logo')
    banner = models.ImageField(upload_to='shops/banner/', blank=True, null=True, verbose_name='店铺横幅')

    # 支付配置
    payment_methods = models.JSONField(default=dict, verbose_name='支付方式')

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # 多租户配置
    auto_create_schema = True
    auto_drop_schema = True

    class Meta:
        db_table = 'shops'
        verbose_name = '店铺'
        verbose_name_plural = '店铺'

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    class Meta:
        db_table = 'shop_domains'
        verbose_name = '店铺域名'
        verbose_name_plural = '店铺域名'


class ShopStaff(models.Model):
    ROLE_CHOICES = (
        ('owner', '店主'),
        ('manager', '店长'),
        ('staff', '员工'),
        ('cashier', '收银员'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shop_staff')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='staff')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    is_active = models.BooleanField(default=True)
    permissions = models.JSONField(default=dict, verbose_name='权限配置')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_staff'
        verbose_name = '店铺员工'
        verbose_name_plural = '店铺员工'
        unique_together = ('user', 'shop')

    def __str__(self):
        return f"{self.user.username} - {self.shop.name}"


class ShopSettings(models.Model):
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name='settings')

    # 订单设置
    auto_confirm_order = models.BooleanField(default=False, verbose_name='自动确认订单')
    order_timeout = models.IntegerField(default=15, verbose_name='订单超时时间(分钟)')

    # 打印设置
    auto_print_order = models.BooleanField(default=False, verbose_name='自动打印订单')
    printer_config = models.JSONField(default=dict, verbose_name='打印机配置')

    # 通知设置
    email_notification = models.BooleanField(default=False, verbose_name='邮件通知')
    sms_notification = models.BooleanField(default=False, verbose_name='短信通知')

    # 积分设置
    points_enabled = models.BooleanField(default=True, verbose_name='启用积分系统')
    points_ratio = models.DecimalField(max_digits=5, decimal_places=2, default=0.1, verbose_name='积分比例')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shop_settings'
        verbose_name = '店铺设置'
        verbose_name_plural = '店铺设置'

    def __str__(self):
        return f"{self.shop.name} 设置"


class Table(models.Model):
    """桌台"""
    TABLE_STATUS_CHOICES = (
        ('available', '空闲'),
        ('occupied', '占用'),
        ('reserved', '预订'),
        ('cleaning', '清洁中'),
        ('maintenance', '维护中'),
    )

    TABLE_TYPE_CHOICES = (
        ('standard', '标准桌'),
        ('booth', '卡座'),
        ('bar', '吧台'),
        ('private', '包间'),
        ('outdoor', '户外桌'),
    )

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='tables')
    table_number = models.CharField(max_length=20, verbose_name='桌台号')
    table_name = models.CharField(max_length=50, blank=True, verbose_name='桌台名称')
    table_type = models.CharField(max_length=20, choices=TABLE_TYPE_CHOICES, default='standard',
                                  verbose_name='桌台类型')

    # 容量信息
    min_capacity = models.IntegerField(default=2, verbose_name='最小人数')
    max_capacity = models.IntegerField(default=4, verbose_name='最大人数')

    # 状态信息
    status = models.CharField(max_length=20, choices=TABLE_STATUS_CHOICES, default='available', verbose_name='状态')
    qr_code = models.ImageField(upload_to='tables/qr_codes/', blank=True, null=True, verbose_name='二维码')

    # 位置信息
    floor = models.CharField(max_length=50, blank=True, verbose_name='楼层')
    section = models.CharField(max_length=50, blank=True, verbose_name='区域')
    position_x = models.IntegerField(default=0, verbose_name='X坐标')
    position_y = models.IntegerField(default=0, verbose_name='Y坐标')

    # 特色信息
    features = models.JSONField(default=dict, verbose_name='特色功能')
    description = models.TextField(blank=True, verbose_name='描述')

    sort_order = models.IntegerField(default=0, verbose_name='排序')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tables'
        verbose_name = '桌台'
        verbose_name_plural = '桌台'
        unique_together = ['shop', 'table_number']

    def __str__(self):
        return f"{self.table_number} - {self.shop.name}"

    def generate_qr_code(self):
        """生成桌台二维码"""
        import qrcode
        from django.conf import settings
        from io import BytesIO
        from django.core.files.base import ContentFile

        # 生成点餐链接
        qr_content = f"{settings.FRONTEND_URL}/menu/?shop={self.shop.id}&table={self.id}"
        qr_img = qrcode.make(qr_content)

        buffer = BytesIO()
        qr_img.save(buffer, format='PNG')

        file_name = f'table_{self.id}_qr.png'
        self.qr_code.save(file_name, ContentFile(buffer.getvalue()), save=False)
        self.save()

    @property
    def current_order(self):
        """获取当前订单"""
        from apps.orders.models import Order
        return Order.objects.filter(
            table=self,
            status__in=['pending', 'paid', 'confirmed', 'preparing']
        ).first()
