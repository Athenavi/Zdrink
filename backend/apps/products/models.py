from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models

User = get_user_model()


class Category(models.Model):
    """商品分类"""
    name = models.CharField(max_length=100, verbose_name='分类名称')
    description = models.TextField(blank=True, verbose_name='分类描述')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='父级分类'
    )
    image = models.ImageField(upload_to='categories/', blank=True, null=True, verbose_name='分类图片')
    sort_order = models.IntegerField(default=0, verbose_name='排序')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='categories')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_categories'
        verbose_name = '商品分类'
        verbose_name_plural = '商品分类'
        ordering = ['sort_order', 'name']
        unique_together = ['shop', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """商品"""
    STATUS_CHOICES = (
        ('draft', '草稿'),
        ('active', '上架'),
        ('inactive', '下架'),
        ('out_of_stock', '缺货'),
    )

    name = models.CharField(max_length=200, verbose_name='商品名称')
    description = models.TextField(blank=True, verbose_name='商品描述')
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products',
        verbose_name='商品分类'
    )

    # 基础信息
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='基础价格'
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        blank=True,
        null=True,
        verbose_name='成本价'
    )

    # 图片
    main_image = models.ImageField(upload_to='products/main/', verbose_name='主图')
    images = models.JSONField(default=list, blank=True, verbose_name='商品图集')

    # 状态和属性
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False, verbose_name='推荐商品')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    # 销售属性
    allow_customization = models.BooleanField(default=False, verbose_name='允许定制')
    preparation_time = models.IntegerField(default=10, verbose_name='准备时间(分钟)')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='products')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        verbose_name = '商品'
        verbose_name_plural = '商品'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Specification(models.Model):
    """规格名称（如：尺寸、颜色、温度等）"""
    name = models.CharField(max_length=50, verbose_name='规格名称')
    display_name = models.CharField(max_length=50, verbose_name='显示名称')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='specifications')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'specifications'
        verbose_name = '商品规格'
        verbose_name_plural = '商品规格'
        unique_together = ['shop', 'name']

    def __str__(self):
        return self.display_name


class SpecificationValue(models.Model):
    """规格值（如：大杯、红色、冰等）"""
    specification = models.ForeignKey(
        Specification,
        on_delete=models.CASCADE,
        related_name='values'
    )
    value = models.CharField(max_length=50, verbose_name='规格值')
    display_value = models.CharField(max_length=50, verbose_name='显示值')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'specification_values'
        verbose_name = '规格值'
        verbose_name_plural = '规格值'
        unique_together = ['specification', 'value']

    def __str__(self):
        return f"{self.specification.display_name}: {self.display_value}"


class ProductSKU(models.Model):
    """商品SKU（库存单位）"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='skus'
    )
    sku_code = models.CharField(max_length=100, unique=True, verbose_name='SKU编码')

    # 价格信息
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='销售价格'
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        blank=True,
        null=True,
        verbose_name='成本价'
    )

    # 库存信息
    stock_quantity = models.IntegerField(default=0, verbose_name='库存数量')
    low_stock_threshold = models.IntegerField(default=5, verbose_name='低库存阈值')

    # 规格组合（存储规格值的ID）
    specifications = models.ManyToManyField(SpecificationValue, blank=True, verbose_name='规格组合')

    # 图片（可覆盖商品主图）
    image = models.ImageField(upload_to='products/skus/', blank=True, null=True, verbose_name='SKU图片')

    # 状态
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_skus'
        verbose_name = '商品SKU'
        verbose_name_plural = '商品SKU'

    def __str__(self):
        spec_values = " | ".join([str(sv) for sv in self.specifications.all()])
        return f"{self.product.name} - {spec_values}"

    @property
    def is_in_stock(self):
        """检查是否有库存"""
        return self.stock_quantity > 0

    @property
    def is_low_stock(self):
        """检查是否低库存"""
        return 0 < self.stock_quantity <= self.low_stock_threshold


class ProductAttribute(models.Model):
    """商品属性（如：辣度、甜度等）"""
    ATTRIBUTE_TYPE_CHOICES = (
        ('text', '文本'),
        ('number', '数字'),
        ('select', '选择'),
        ('checkbox', '复选框'),
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='attributes'
    )
    name = models.CharField(max_length=50, verbose_name='属性名称')
    attribute_type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPE_CHOICES, default='select')
    is_required = models.BooleanField(default=False, verbose_name='是否必选')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_attributes'
        verbose_name = '商品属性'
        verbose_name_plural = '商品属性'

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class ProductAttributeOption(models.Model):
    """商品属性选项"""
    attribute = models.ForeignKey(
        ProductAttribute,
        on_delete=models.CASCADE,
        related_name='options'
    )
    value = models.CharField(max_length=100, verbose_name='选项值')
    additional_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='附加价格'
    )
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_attribute_options'
        verbose_name = '商品属性选项'
        verbose_name_plural = '商品属性选项'

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class InventoryLog(models.Model):
    """库存变更日志"""
    ACTION_CHOICES = (
        ('purchase', '采购入库'),
        ('sale', '销售出库'),
        ('adjustment', '库存调整'),
        ('return', '退货入库'),
        ('waste', '报损出库'),
    )

    sku = models.ForeignKey(ProductSKU, on_delete=models.CASCADE, related_name='inventory_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    quantity_change = models.IntegerField(verbose_name='数量变化')
    current_quantity = models.IntegerField(verbose_name='变更后数量')
    reference_id = models.CharField(max_length=100, blank=True, verbose_name='关联单据ID')
    notes = models.TextField(blank=True, verbose_name='备注')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_logs'
        verbose_name = '库存日志'
        verbose_name_plural = '库存日志'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sku} - {self.action} - {self.quantity_change}"


class ProductImage(models.Model):
    """商品图片"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='product_images'
    )
    image = models.ImageField(upload_to='products/gallery/')
    alt_text = models.CharField(max_length=200, blank=True, verbose_name='替代文本')
    sort_order = models.IntegerField(default=0, verbose_name='排序')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_images'
        verbose_name = '商品图片'
        verbose_name_plural = '商品图片'
        ordering = ['sort_order']

    def __str__(self):
        return f"{self.product.name} - 图片"