from rest_framework import serializers

from .models import (
    Category, Product, Specification, SpecificationValue,
    ProductSKU, ProductAttribute, ProductAttributeOption,
    InventoryLog, ProductImage
)


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('shop', 'created_at', 'updated_at')

    def get_children_count(self, obj):
        return obj.children.count()

    def get_products_count(self, obj):
        return obj.products.count()


class SpecificationValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecificationValue
        fields = '__all__'


class SpecificationSerializer(serializers.ModelSerializer):
    values = SpecificationValueSerializer(many=True, read_only=True)

    class Meta:
        model = Specification
        fields = '__all__'
        read_only_fields = ('shop', 'created_at', 'updated_at')


class ProductAttributeOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttributeOption
        fields = '__all__'


class ProductAttributeSerializer(serializers.ModelSerializer):
    options = ProductAttributeOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ProductAttribute
        fields = '__all__'


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = '__all__'


class ProductSKUSerializer(serializers.ModelSerializer):
    specifications = SpecificationValueSerializer(many=True, read_only=True)
    specification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductSKU
        fields = '__all__'

    def create(self, validated_data):
        specification_ids = validated_data.pop('specification_ids', [])
        sku = ProductSKU.objects.create(**validated_data)

        if specification_ids:
            sku.specifications.set(specification_ids)

        return sku

    def update(self, instance, validated_data):
        specification_ids = validated_data.pop('specification_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if specification_ids is not None:
            instance.specifications.set(specification_ids)

        return instance


class ProductListSerializer(serializers.ModelSerializer):
    """商品列表序列化器（简化版）"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    has_variants = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'category_name', 'base_price',
            'main_image', 'status', 'is_featured', 'sort_order',
            'min_price', 'max_price', 'has_variants', 'created_at'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """商品详情序列化器"""
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True)
    skus = ProductSKUSerializer(many=True, read_only=True)
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    specifications = SpecificationSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('shop', 'created_by', 'created_at', 'updated_at')


class ProductCreateSerializer(serializers.ModelSerializer):
    """商品创建序列化器"""

    class Meta:
        model = Product
        exclude = ('shop', 'created_by')

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['shop'] = request.tenant
        validated_data['created_by'] = request.user

        return super().create(validated_data)


class InventoryLogSerializer(serializers.ModelSerializer):
    sku_name = serializers.CharField(source='sku.__str__', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = InventoryLog
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')


class StockAdjustmentSerializer(serializers.Serializer):
    """库存调整序列化器"""
    sku_id = serializers.IntegerField()
    adjustment_type = serializers.ChoiceField(choices=[('increase', '增加'), ('decrease', '减少')])
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)


class BulkStockUpdateSerializer(serializers.Serializer):
    """批量库存更新序列化器"""
    updates = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )


class ProductExportSerializer(serializers.ModelSerializer):
    """商品导出序列化器"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    sku_count = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category_name', 'base_price', 'status',
            'sku_count', 'total_stock', 'created_at'
        ]

    def get_sku_count(self, obj):
        return obj.skus.count()

    def get_total_stock(self, obj):
        return sum(sku.stock_quantity for sku in obj.skus.all())