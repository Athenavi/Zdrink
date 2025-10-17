from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog
from .serializers import (
    CartSerializer, CartItemSerializer, AddToCartSerializer,
    OrderListSerializer, OrderDetailSerializer, CreateOrderSerializer,
    UpdateOrderStatusSerializer, OrderStatisticsSerializer
)
from ..core.permissions import IsShopOwnerOrStaff, HasShopPermission
from ..products.models import Product, ProductSKU


class CartViewSet(ModelViewSet):
    """购物车视图集"""
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'add_item':
            return AddToCartSerializer
        return CartSerializer

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """添加商品到购物车"""
        serializer = AddToCartSerializer(data=request.data)
        if serializer.is_valid():
            cart, created = Cart.objects.get_or_create(user=request.user)

            try:
                with transaction.atomic():
                    cart_item, created = CartItem.objects.get_or_create(
                        cart=cart,
                        product_id=serializer.validated_data['product_id'],
                        sku_id=serializer.validated_data.get('sku_id'),
                        defaults={
                            'quantity': serializer.validated_data['quantity'],
                            'unit_price': self._get_unit_price(serializer.validated_data),
                            'customization': serializer.validated_data.get('customization', '')
                        }
                    )

                    if not created:
                        cart_item.quantity += serializer.validated_data['quantity']
                        cart_item.save()

                    # 添加属性选项
                    if serializer.validated_data.get('attribute_option_ids'):
                        cart_item.attribute_options.set(serializer.validated_data['attribute_option_ids'])

                    return Response(CartItemSerializer(cart_item).data, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _get_unit_price(self, data):
        product = Product.objects.get(id=data['product_id'])

        if data.get('sku_id'):
            sku = ProductSKU.objects.get(id=data['sku_id'])
            return sku.price
        else:
            return product.base_price

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        """清空购物车"""
        cart = self.get_object()
        cart.items.all().delete()
        return Response({'message': '购物车已清空'})

    @action(detail=False, methods=['get'])
    def my_cart(self, request):
        """获取当前用户的购物车"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)


class OrderViewSet(ModelViewSet):
    """订单视图集"""
    permission_classes = [IsShopOwnerOrStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_number', 'customer_name', 'customer_phone']
    ordering_fields = ['created_at', 'total_amount', 'status']
    filterset_fields = ['status', 'order_type', 'payment_status']

    def get_queryset(self):
        queryset = Order.objects.filter(shop=self.request.tenant).select_related(
            'user'
        ).prefetch_related(
            'items', 'status_logs', 'payments'
        )

        # 客户只能看到自己的订单
        if self.request.user.user_type == 'customer':
            queryset = queryset.filter(user=self.request.user)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        elif self.action == 'list':
            return OrderListSerializer
        return OrderDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'my_orders']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """创建订单"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """获取当前用户的订单"""
        orders = self.get_queryset().filter(user=request.user)
        page = self.paginate_queryset(orders)

        if page is not None:
            serializer = OrderListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """更新订单状态"""
        order = self.get_object()
        serializer = UpdateOrderStatusSerializer(data=request.data)

        if serializer.is_valid():
            old_status = order.status
            new_status = serializer.validated_data['status']

            with transaction.atomic():
                order.status = new_status

                # 如果是完成状态，记录完成时间
                if new_status == 'completed':
                    order.completed_at = timezone.now()

                order.save()

                # 记录状态变更日志
                OrderStatusLog.objects.create(
                    order=order,
                    old_status=old_status,
                    new_status=new_status,
                    notes=serializer.validated_data.get('notes', ''),
                    created_by=request.user
                )

            return Response(OrderDetailSerializer(order).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消订单"""
        order = self.get_object()

        if order.status not in ['pending', 'paid', 'confirmed']:
            return Response(
                {'error': '当前状态无法取消订单'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            old_status = order.status
            order.status = 'cancelled'
            order.save()

            # 恢复库存
            for item in order.items.all():
                if item.sku:
                    item.sku.stock_quantity += item.quantity
                    item.sku.save()

            # 记录状态变更
            OrderStatusLog.objects.create(
                order=order,
                old_status=old_status,
                new_status='cancelled',
                notes=request.data.get('notes', '用户取消订单'),
                created_by=request.user
            )

        return Response(OrderDetailSerializer(order).data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """订单统计"""
        # 今日统计
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        today_end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))

        today_orders = Order.objects.filter(
            shop=request.tenant,
            created_at__range=[today_start, today_end]
        )

        today_stats = {
            'total_orders': today_orders.count(),
            'total_revenue': today_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'pending_orders': today_orders.filter(status='pending').count(),
            'preparing_orders': today_orders.filter(status='preparing').count(),
        }

        # 近7天统计
        seven_days_ago = today - timedelta(days=7)
        weekly_stats = Order.objects.filter(
            shop=request.tenant,
            created_at__gte=seven_days_ago
        ).extra(
            {'date': "DATE(created_at)"}
        ).values('date').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total_amount')
        ).order_by('date')

        return Response({
            'today': today_stats,
            'weekly': weekly_stats
        })

    @action(detail=False, methods=['get'],
            permission_classes=[HasShopPermission('report_view')])
    def sales_report(self, request):
        """销售报表"""
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')

        orders = Order.objects.filter(shop=request.tenant)

        if start_date:
            orders = orders.filter(created_at__gte=start_date)
        if end_date:
            orders = orders.filter(created_at__lte=end_date)

        report_data = orders.extra(
            {'date': "DATE(created_at)"}
        ).values('date').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total_amount'),
            average_order_value=Sum('total_amount') / Count('id')
        ).order_by('date')

        serializer = OrderStatisticsSerializer(report_data, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_dashboard(request):
    """订单仪表板数据"""
    shop = request.tenant

    # 今日订单统计
    today = timezone.now().date()
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
    today_end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))

    today_orders = Order.objects.filter(
        shop=shop,
        created_at__range=[today_start, today_end]
    )

    # 状态统计
    status_stats = today_orders.values('status').annotate(count=Count('id'))

    # 热门商品
    popular_products = OrderItem.objects.filter(
        order__shop=shop,
        order__created_at__range=[today_start, today_end]
    ).values('product_name').annotate(
        total_quantity=Sum('quantity')
    ).order_by('-total_quantity')[:10]

    return Response({
        'today_stats': {
            'total_orders': today_orders.count(),
            'total_revenue': today_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'status_distribution': {stat['status']: stat['count'] for stat in status_stats},
        },
        'popular_products': list(popular_products)
    })
