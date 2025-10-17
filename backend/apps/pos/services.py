import uuid
from decimal import Decimal

from django.db import transaction
from django.utils import timezone


class POSService:
    """收银台服务"""

    def __init__(self, shop):
        self.shop = shop

    def create_quick_order(self, order_data, user=None):
        """创建快速订单（收银台用）"""
        from apps.orders.models import Order, OrderItem
        from apps.products.models import Product, ProductSKU

        with transaction.atomic():
            # 生成订单号
            order_number = f"POS{int(time.time())}{uuid.uuid4().hex[:4].upper()}"

            # 创建订单
            order = Order.objects.create(
                order_number=order_number,
                shop=self.shop,
                user=user,
                order_type=order_data.get('order_type', 'dine_in'),
                customer_name=order_data.get('customer_name', '散客'),
                customer_phone=order_data.get('customer_phone', ''),
                table_number=order_data.get('table_number', ''),
                status='paid',  # 收银台订单直接标记为已支付
                payment_status=True,
                paid_at=timezone.now(),
                payment_method=order_data.get('payment_method', 'cash')
            )

            # 添加订单商品
            subtotal = Decimal('0.00')
            for item_data in order_data.get('items', []):
                product_id = item_data['product_id']
                sku_id = item_data.get('sku_id')
                quantity = item_data['quantity']

                try:
                    product = Product.objects.get(id=product_id, shop=self.shop)

                    # 获取单价
                    if sku_id:
                        sku = ProductSKU.objects.get(id=sku_id, product=product)
                        unit_price = sku.price
                        specifications = {
                            spec.specification.display_name: spec.display_value
                            for spec in sku.specifications.all()
                        }
                    else:
                        unit_price = product.base_price
                        specifications = {}

                    total_price = unit_price * quantity
                    subtotal += total_price

                    # 创建订单项
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        sku=sku if sku_id else None,
                        product_name=product.name,
                        product_image=product.main_image.url if product.main_image else '',
                        specifications=specifications,
                        unit_price=unit_price,
                        quantity=quantity,
                        total_price=total_price,
                        attribute_selections=item_data.get('attribute_selections', {}),
                        customization=item_data.get('customization', '')
                    )

                    # 更新库存
                    if sku_id:
                        sku.stock_quantity = max(0, sku.stock_quantity - quantity)
                        sku.save()

                except (Product.DoesNotExist, ProductSKU.DoesNotExist):
                    continue

            # 更新订单金额
            order.subtotal = subtotal
            order.total_amount = subtotal
            order.save()

            return order

    def apply_discount(self, order, discount_type, discount_value):
        """应用折扣"""
        if discount_type == 'percentage':
            discount_amount = order.subtotal * (discount_value / 100)
        elif discount_type == 'fixed':
            discount_amount = discount_value
        else:
            discount_amount = Decimal('0.00')

        order.discount_amount = discount_amount
        order.total_amount = order.subtotal - discount_amount
        order.save()

        return discount_amount

    def split_order(self, order, split_data):
        """拆分订单"""
        from apps.orders.models import Order, OrderItem

        with transaction.atomic():
            # 创建新订单
            new_order = Order.objects.create(
                order_number=f"SPLIT{int(time.time())}{uuid.uuid4().hex[:4].upper()}",
                shop=order.shop,
                user=order.user,
                order_type=order.order_type,
                customer_name=order.customer_name,
                customer_phone=order.customer_phone,
                table_number=order.table_number,
                status=order.status,
                payment_status=False
            )

            # 移动商品到新订单
            moved_items = []
            for item_data in split_data:
                try:
                    item = OrderItem.objects.get(id=item_data['item_id'], order=order)

                    # 创建新订单项
                    new_item = OrderItem.objects.create(
                        order=new_order,
                        product=item.product,
                        sku=item.sku,
                        product_name=item.product_name,
                        product_image=item.product_image,
                        specifications=item.specifications,
                        unit_price=item.unit_price,
                        quantity=item_data.get('quantity', item.quantity),
                        total_price=item.unit_price * item_data.get('quantity', item.quantity),
                        attribute_selections=item.attribute_selections,
                        customization=item.customization
                    )

                    moved_items.append(new_item)

                    # 更新原订单项数量
                    if item_data.get('quantity', item.quantity) < item.quantity:
                        item.quantity -= item_data.get('quantity', item.quantity)
                        item.total_price = item.unit_price * item.quantity
                        item.save()
                    else:
                        item.delete()

                except OrderItem.DoesNotExist:
                    continue

            # 重新计算两个订单的金额
            self._recalculate_order_amount(order)
            self._recalculate_order_amount(new_order)

            return new_order

    def _recalculate_order_amount(self, order):
        """重新计算订单金额"""
        subtotal = sum(item.total_price for item in order.items.all())
        order.subtotal = subtotal
        order.total_amount = subtotal - order.discount_amount
        order.save()

    def merge_orders(self, main_order, merge_order_ids):
        """合并订单"""
        from apps.orders.models import Order

        with transaction.atomic():
            for order_id in merge_order_ids:
                try:
                    merge_order = Order.objects.get(id=order_id, shop=self.shop)

                    # 移动所有商品到主订单
                    for item in merge_order.items.all():
                        item.order = main_order
                        item.save()

                    # 删除被合并的订单
                    merge_order.delete()

                except Order.DoesNotExist:
                    continue

            # 重新计算主订单金额
            self._recalculate_order_amount(main_order)

            return main_order


class BarcodeService:
    """条码扫描服务"""

    def __init__(self, shop):
        self.shop = shop

    def scan_product(self, barcode):
        """扫描条码获取商品信息"""
        from apps.products.models import Product, ProductSKU

        # 先搜索SKU条码
        sku = ProductSKU.objects.filter(
            product__shop=self.shop,
            barcode=barcode
        ).first()

        if sku:
            return {
                'type': 'sku',
                'id': sku.id,
                'product_id': sku.product.id,
                'name': sku.product.name,
                'price': sku.price,
                'stock_quantity': sku.stock_quantity,
                'specifications': [
                    {
                        'name': spec.specification.display_name,
                        'value': spec.display_value
                    } for spec in sku.specifications.all()
                ]
            }

        # 搜索商品条码
        product = Product.objects.filter(
            shop=self.shop,
            barcode=barcode
        ).first()

        if product:
            return {
                'type': 'product',
                'id': product.id,
                'product_id': product.id,
                'name': product.name,
                'price': product.base_price,
                'stock_quantity': 'N/A',  # 商品本身没有库存，SKU才有
                'specifications': []
            }

        return None

    def scan_member_card(self, card_number):
        """扫描会员卡"""
        from apps.users.models import User

        user = User.objects.filter(
            membership_number=card_number
        ).first()

        if user:
            return {
                'user_id': user.id,
                'username': user.username,
                'membership_level': user.membership_level,
                'available_points': user.available_points,
                'discount_rate': self._get_membership_discount_rate(user.membership_level)
            }

        return None

    def _get_membership_discount_rate(self, membership_level):
        """获取会员折扣率"""
        from apps.users.models import MembershipLevelConfig

        try:
            config = MembershipLevelConfig.objects.get(
                level=membership_level,
                is_active=True
            )
            return config.discount_rate
        except MembershipLevelConfig.DoesNotExist:
            return Decimal('1.0')  # 无折扣


class TableManagementService:
    """桌台管理服务"""

    def __init__(self, shop):
        self.shop = shop

    def get_table_status(self):
        """获取所有桌台状态"""
        from .models import Table
        from apps.orders.models import Order

        tables = Table.objects.filter(shop=self.shop, is_active=True)
        table_status = []

        for table in tables:
            current_order = table.current_order
            table_status.append({
                'table_id': table.id,
                'table_number': table.table_number,
                'table_name': table.table_name,
                'status': table.status,
                'current_order': {
                    'order_number': current_order.order_number if current_order else None,
                    'status': current_order.status if current_order else None,
                    'total_amount': current_order.total_amount if current_order else None,
                    'created_at': current_order.created_at if current_order else None
                } if current_order else None,
                'capacity': f"{table.min_capacity}-{table.max_capacity}人"
            })

        return table_status

    def update_table_status(self, table_id, status, order_id=None):
        """更新桌台状态"""
        from .models import Table
        from apps.orders.models import Order

        try:
            table = Table.objects.get(id=table_id, shop=self.shop)
            table.status = status

            if order_id:
                order = Order.objects.get(id=order_id, shop=self.shop)
                order.table = table
                order.save()

            table.save()

            return True
        except (Table.DoesNotExist, Order.DoesNotExist):
            return False

    def get_available_tables(self, capacity=None):
        """获取可用桌台"""
        from .models import Table

        tables = Table.objects.filter(
            shop=self.shop,
            status='available',
            is_active=True
        )

        if capacity:
            tables = tables.filter(
                min_capacity__lte=capacity,
                max_capacity__gte=capacity
            )

        return tables