import uuid

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

User = get_user_model()


class Cart(models.Model):
    """购物车"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carts')
    session_key = models.CharField(max_length=100, blank=True, null=True)  # 用于未登录用户
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'
        verbose_name = '购物车'
        verbose_name_plural = '购物车'

    def __str__(self):
        return f"Cart {self.id} - {self.user.username if self.user else 'Anonymous'}"

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def total_quantity(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    """购物车商品"""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    sku = models.ForeignKey('products.ProductSKU', on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    # 商品属性选择
    attribute_options = models.ManyToManyField('products.ProductAttributeOption', blank=True)

    # 定制要求
    customization = models.TextField(blank=True, verbose_name='定制要求')

    # 单价快照
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='单价')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart_items'
        verbose_name = '购物车商品'
        verbose_name_plural = '购物车商品'
        unique_together = ['cart', 'product', 'sku']

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    @property
    def total_price(self):
        additional_price = sum(option.additional_price for option in self.attribute_options.all())
        return (self.unit_price + additional_price) * self.quantity


class Order(models.Model):
    """订单"""
    ORDER_STATUS_CHOICES = (
        ('pending', '待支付'),
        ('paid', '已支付'),
        ('confirmed', '已确认'),
        ('preparing', '制作中'),
        ('ready', '已就绪'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
        ('refunded', '已退款'),
    )

    ORDER_TYPE_CHOICES = (
        ('dine_in', '堂食'),
        ('takeaway', '自取'),
        ('delivery', '外卖'),
    )

    # 订单基础信息
    order_number = models.CharField(max_length=20, unique=True, verbose_name='订单号')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')

    # 订单状态
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='dine_in')

    # 价格信息
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='商品总额')
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='配送费')
    discount_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='优惠金额')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='实付金额')

    # 支付信息
    payment_method = models.CharField(max_length=50, blank=True, verbose_name='支付方式')
    payment_status = models.BooleanField(default=False, verbose_name='支付状态')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')

    # 客户信息
    customer_name = models.CharField(max_length=100, verbose_name='客户姓名')
    customer_phone = models.CharField(max_length=20, verbose_name='客户电话')
    customer_notes = models.TextField(blank=True, verbose_name='客户备注')

    # 配送信息（外卖订单）
    delivery_address = models.TextField(blank=True, verbose_name='配送地址')
    delivery_time = models.DateTimeField(null=True, blank=True, verbose_name='期望配送时间')

    # 自取/堂食信息
    pickup_time = models.DateTimeField(null=True, blank=True, verbose_name='取餐时间')
    table_number = models.CharField(max_length=20, blank=True, verbose_name='桌号')

    # 店铺关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='orders')

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')

    class Meta:
        db_table = 'orders'
        verbose_name = '订单'
        verbose_name_plural = '订单'
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    def generate_order_number(self):
        import time
        return f"ORD{int(time.time())}{uuid.uuid4().hex[:6].upper()}"

    @property
    def estimated_preparation_time(self):
        """估算准备时间"""
        max_prep_time = max([item.product.preparation_time for item in self.items.all()], default=0)
        return max_prep_time


class OrderItem(models.Model):
    """订单商品"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.PROTECT)
    sku = models.ForeignKey('products.ProductSKU', on_delete=models.PROTECT, null=True, blank=True)

    # 商品信息快照
    product_name = models.CharField(max_length=200, verbose_name='商品名称')
    product_image = models.CharField(max_length=500, blank=True, verbose_name='商品图片')
    specifications = models.JSONField(default=dict, verbose_name='规格信息')

    # 价格和数量
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='单价')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    total_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='总价')

    # 属性选择
    attribute_selections = models.JSONField(default=dict, verbose_name='属性选择')
    customization = models.TextField(blank=True, verbose_name='定制要求')

    class Meta:
        db_table = 'order_items'
        verbose_name = '订单商品'
        verbose_name_plural = '订单商品'

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class OrderStatusLog(models.Model):
    """订单状态日志"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs')
    old_status = models.CharField(max_length=20, choices=Order.ORDER_STATUS_CHOICES)
    new_status = models.CharField(max_length=20, choices=Order.ORDER_STATUS_CHOICES)
    notes = models.TextField(blank=True, verbose_name='备注')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_logs'
        verbose_name = '订单状态日志'
        verbose_name_plural = '订单状态日志'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order.order_number} - {self.old_status} -> {self.new_status}"


class OrderPayment(models.Model):
    """订单支付记录"""
    PAYMENT_METHOD_CHOICES = (
        ('wechat', '微信支付'),
        ('alipay', '支付宝'),
        ('cash', '现金'),
        ('card', '银行卡'),
        ('balance', '余额支付'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('pending', '待支付'),
        ('paid', '支付成功'),
        ('failed', '支付失败'),
        ('refunded', '已退款'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_payments')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True, verbose_name='交易ID')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='支付金额')

    # 支付信息
    payment_data = models.JSONField(default=dict, verbose_name='支付数据')
    refund_data = models.JSONField(default=dict, verbose_name='退款数据')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='支付时间')

    class Meta:
        db_table = 'order_payments'
        verbose_name = '订单支付'
        verbose_name_plural = '订单支付'

    def __str__(self):
        return f"{self.order.order_number} - {self.payment_method} - {self.amount}"