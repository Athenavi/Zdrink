from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.products.models import Product, ProductSKU
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
        # 如果是部分更新（PATCH），只验证提供的字段
        if self.partial:
            # 更新数量时，只需要验证数量
            quantity = data.get('quantity')
            if quantity is not None and quantity < 1:
                raise serializers.ValidationError("数量必须大于 0")
            return data

        # 完整更新（PUT）或创建时才进行完整验证
        product = data.get('product')
        sku = data.get('sku')
        quantity = data.get('quantity', 1)

        # 验证 SKU 属于该商品
        if sku and sku.product != product:
            raise serializers.ValidationError("SKU 不属于该商品")
    
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
        try:
            if hasattr(obj, 'items_count') and obj.items_count is not None:
                return obj.items_count
            # 使用 prefetch_related 优化查询
            if hasattr(obj, '_prefetched_objects_cache') and 'items' in obj._prefetched_objects_cache:
                return obj.items.all().count()
            return obj.items.count()
        except Exception as e:
            print(f'[WARNING] get_items_count error: {e}')
            return 0

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

        print(f'[DEBUG] CreateOrderSerializer.create - cart_id: {cart_id}')
        print(f'[DEBUG] CreateOrderSerializer.create - items_data: {items_data}')
        print(f'[DEBUG] CreateOrderSerializer.create - validated_data: {validated_data}')

        with transaction.atomic():
            # 创建订单实例（不保存到数据库）
            order = Order(
                shop=request.tenant,
                user=request.user if request.user.is_authenticated else None,
                **validated_data
            )

            print(f'[DEBUG] Order instance created (not saved yet)')

            # 从购物车创建订单商品
            if cart_id:
                try:
                    cart = Cart.objects.get(id=cart_id, user=request.user)
                    print(f'[DEBUG] Found cart with {cart.items.count()} items')
                    # 先保存订单以获取 ID，但需要先设置默认金额
                    order.subtotal = Decimal('0.00')
                    order.delivery_fee = Decimal('0.00')
                    order.total_amount = Decimal('0.00')
                    order.discount_amount = Decimal('0.00')
                    order.save()
                    print(f'[DEBUG] Order saved with id: {order.id}')
                    self._create_order_items_from_cart(order, cart)
                    # 重新计算金额
                    self._calculate_order_totals(order)
                except Cart.DoesNotExist:
                    print(f'[DEBUG] Cart not found')
                    # 如果没有购物车商品，设置默认值
                    order.subtotal = Decimal('0.00')
                    order.delivery_fee = Decimal('0.00')
                    order.total_amount = Decimal('0.00')
                    order.discount_amount = Decimal('0.00')
                    order.save()
                    return order

            # 从直接数据创建订单商品
            if items_data:
                # 如果需要保存订单
                if not order.id:
                    order.subtotal = Decimal('0.00')
                    order.delivery_fee = Decimal('0.00')
                    order.total_amount = Decimal('0.00')
                    order.discount_amount = Decimal('0.00')
                    order.save()
                self._create_order_items_from_data(order, items_data)
                # 重新计算金额
                self._calculate_order_totals(order)

            # 如果没有执行上面的逻辑（既没有 cart 也没有 items_data），需要保存订单
            if not order.id:
                order.subtotal = Decimal('0.00')
                order.delivery_fee = Decimal('0.00')
                order.total_amount = Decimal('0.00')
                order.discount_amount = Decimal('0.00')
                order.save()

            print(f'[DEBUG] Order totals calculated - subtotal: {order.subtotal}, total: {order.total_amount}')

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
        # 计算商品总额
        subtotal = sum(item.total_price for item in order.items.all())

        print(f'[DEBUG] _calculate_order_totals - items count: {order.items.count()}')
        print(f'[DEBUG] _calculate_order_totals - subtotal: {subtotal}')

        # 计算配送费（这里可以根据业务逻辑调整）
        delivery_fee = Decimal('0.00')
        if order.order_type == 'delivery':
            delivery_fee = order.shop.delivery_fee if order.shop else Decimal('0.00')
            print(f'[DEBUG] _calculate_order_totals - delivery_fee: {delivery_fee}')

        # 设置订单金额
        order.subtotal = subtotal or Decimal('0.00')
        order.delivery_fee = delivery_fee
        order.total_amount = (subtotal or Decimal('0.00')) + delivery_fee - (order.discount_amount or Decimal('0.00'))
        order.save()

        print(f'[DEBUG] _calculate_order_totals - final subtotal: {order.subtotal}, total: {order.total_amount}')


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