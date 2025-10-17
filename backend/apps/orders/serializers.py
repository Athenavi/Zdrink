from decimal import Decimal

from apps.products.models import Product, ProductSKU
from django.db import transaction
from rest_framework import serializers

from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog, OrderPayment


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.CharField(source='product.main_image.url', read_only=True)
    sku_info = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = '__all__'

    def get_sku_info(self, obj):
        if obj.sku:
            return {
                'id': obj.sku.id,
                'specifications': [
                    {
                        'name': spec.specification.display_name,
                        'value': spec.display_value
                    } for spec in obj.sku.specifications.all()
                ]
            }
        return None

    def validate(self, data):
        product = data.get('product')
        sku = data.get('sku')
        quantity = data.get('quantity', 1)

        # 验证SKU属于该商品
        if sku and sku.product != product:
            raise serializers.ValidationError("SKU不属于该商品")

        # 验证库存
        if sku and sku.stock_quantity < quantity:
            raise serializers.ValidationError("库存不足")

        # 设置单价
        if sku:
            data['unit_price'] = sku.price
        else:
            data['unit_price'] = product.base_price

        return data


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = '__all__'


class AddToCartSerializer(serializers.Serializer):
    """添加到购物车序列化器"""
    product_id = serializers.IntegerField()
    sku_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1, min_value=1)
    attribute_option_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )
    customization = serializers.CharField(required=False, allow_blank=True)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderStatusLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = OrderStatusLog
        fields = '__all__'


class OrderPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderPayment
        fields = '__all__'


class OrderListSerializer(serializers.ModelSerializer):
    """订单列表序列化器"""
    items_count = serializers.SerializerMethodField()
    customer_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'order_type', 'total_amount',
            'customer_name', 'customer_phone', 'items_count', 'created_at',
            'customer_info'
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_customer_info(self, obj):
        return {
            'name': obj.customer_name,
            'phone': obj.customer_phone
        }


class OrderDetailSerializer(serializers.ModelSerializer):
    """订单详情序列化器"""
    items = OrderItemSerializer(many=True, read_only=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)
    payments = OrderPaymentSerializer(many=True, read_only=True)
    estimated_preparation_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = '__all__'


class CreateOrderSerializer(serializers.ModelSerializer):
    """创建订单序列化器"""
    cart_id = serializers.IntegerField(required=False)
    items = serializers.ListField(child=serializers.DictField(), required=False)

    class Meta:
        model = Order
        fields = [
            'order_type', 'customer_name', 'customer_phone', 'customer_notes',
            'delivery_address', 'delivery_time', 'pickup_time', 'table_number',
            'cart_id', 'items'
        ]

    def validate(self, data):
        order_type = data.get('order_type')

        # 验证外卖订单必须有配送地址
        if order_type == 'delivery' and not data.get('delivery_address'):
            raise serializers.ValidationError("外卖订单必须填写配送地址")

        # 验证自取订单必须有取餐时间
        if order_type == 'takeaway' and not data.get('pickup_time'):
            raise serializers.ValidationError("自取订单必须选择取餐时间")

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        cart_id = validated_data.pop('cart_id', None)
        items_data = validated_data.pop('items', [])

        with transaction.atomic():
            # 创建订单
            order = Order.objects.create(
                shop=request.tenant,
                user=request.user if request.user.is_authenticated else None,
                **validated_data
            )

            # 从购物车创建订单商品
            if cart_id:
                try:
                    cart = Cart.objects.get(id=cart_id, user=request.user)
                    self._create_order_items_from_cart(order, cart)
                except Cart.DoesNotExist:
                    pass

            # 从直接数据创建订单商品
            if items_data:
                self._create_order_items_from_data(order, items_data)

            # 计算订单金额
            self._calculate_order_totals(order)

            # 创建初始状态日志
            OrderStatusLog.objects.create(
                order=order,
                old_status='pending',
                new_status='pending',
                notes='订单创建',
                created_by=request.user if request.user.is_authenticated else None
            )

        return order

    def _create_order_items_from_cart(self, order, cart):
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                sku=cart_item.sku,
                product_name=cart_item.product.name,
                product_image=cart_item.product.main_image.url if cart_item.product.main_image else '',
                specifications=self._get_specifications_data(cart_item.sku),
                unit_price=cart_item.unit_price,
                quantity=cart_item.quantity,
                total_price=cart_item.total_price,
                attribute_selections=self._get_attribute_selections_data(cart_item.attribute_options.all()),
                customization=cart_item.customization
            )

            # 更新库存
            if cart_item.sku:
                cart_item.sku.stock_quantity -= cart_item.quantity
                cart_item.sku.save()

        # 清空购物车
        cart.items.all().delete()

    def _create_order_items_from_data(self, order, items_data):
        for item_data in items_data:
            product = Product.objects.get(id=item_data['product_id'])
            sku = None
            if item_data.get('sku_id'):
                sku = ProductSKU.objects.get(id=item_data['sku_id'])

            unit_price = sku.price if sku else product.base_price
            total_price = unit_price * item_data['quantity']

            OrderItem.objects.create(
                order=order,
                product=product,
                sku=sku,
                product_name=product.name,
                product_image=product.main_image.url if product.main_image else '',
                specifications=self._get_specifications_data(sku),
                unit_price=unit_price,
                quantity=item_data['quantity'],
                total_price=total_price,
                attribute_selections=item_data.get('attribute_selections', {}),
                customization=item_data.get('customization', '')
            )

            # 更新库存
            if sku:
                sku.stock_quantity -= item_data['quantity']
                sku.save()

    def _get_specifications_data(self, sku):
        if not sku:
            return {}

        return {
            spec.specification.display_name: spec.display_value
            for spec in sku.specifications.all()
        }

    def _get_attribute_selections_data(self, attribute_options):
        return {
            option.attribute.name: option.value
            for option in attribute_options
        }

    def _calculate_order_totals(self, order):
        subtotal = sum(item.total_price for item in order.items.all())

        # 计算配送费（这里可以根据业务逻辑调整）
        delivery_fee = Decimal('0.00')
        if order.order_type == 'delivery':
            delivery_fee = order.shop.delivery_fee

        order.subtotal = subtotal
        order.delivery_fee = delivery_fee
        order.total_amount = subtotal + delivery_fee - order.discount_amount
        order.save()


class UpdateOrderStatusSerializer(serializers.Serializer):
    """更新订单状态序列化器"""
    status = serializers.ChoiceField(choices=Order.ORDER_STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)


class OrderStatisticsSerializer(serializers.Serializer):
    """订单统计序列化器"""
    date = serializers.DateField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)