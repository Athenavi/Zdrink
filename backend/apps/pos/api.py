from apps.core.permissions import IsShopOwnerOrStaff
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .serializers import (
    QuickOrderSerializer, BarcodeScanSerializer, TableStatusSerializer,
    OrderSplitSerializer, OrderMergeSerializer, CashierShiftSerializer
)
from .services import POSService, BarcodeService, TableManagementService


class POSViewSet(ModelViewSet):
    """POS收银台视图"""
    permission_classes = [IsShopOwnerOrStaff]

    @action(detail=False, methods=['post'])
    def quick_order(self, request):
        """快速下单"""
        serializer = QuickOrderSerializer(data=request.data)

        if serializer.is_valid():
            pos_service = POSService(request.tenant)

            try:
                order = pos_service.create_quick_order(
                    serializer.validated_data,
                    user=request.user
                )

                # 应用折扣
                if serializer.validated_data.get('apply_discount', False):
                    discount_type = serializer.validated_data.get('discount_type')
                    discount_value = serializer.validated_data.get('discount_value', 0)
                    pos_service.apply_discount(order, discount_type, discount_value)

                from apps.orders.serializers import OrderDetailSerializer
                return Response(OrderDetailSerializer(order).data)

            except Exception as e:
                return Response(
                    {'error': f'创建订单失败: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def scan_barcode(self, request):
        """扫描条码"""
        serializer = BarcodeScanSerializer(data=request.data)

        if serializer.is_valid():
            barcode = serializer.validated_data['barcode']
            barcode_service = BarcodeService(request.tenant)

            # 先尝试扫描商品
            product_info = barcode_service.scan_product(barcode)
            if product_info:
                return Response({
                    'type': 'product',
                    'data': product_info
                })

            # 尝试扫描会员卡
            member_info = barcode_service.scan_member_card(barcode)
            if member_info:
                return Response({
                    'type': 'member',
                    'data': member_info
                })

            return Response(
                {'error': '未找到对应的商品或会员'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def split_order(self, request):
        """拆分订单"""
        serializer = OrderSplitSerializer(data=request.data)

        if serializer.is_valid():
            order_id = serializer.validated_data['order_id']
            split_items = serializer.validated_data['split_items']

            from apps.orders.models import Order
            try:
                order = Order.objects.get(id=order_id, shop=request.tenant)
                pos_service = POSService(request.tenant)
                new_order = pos_service.split_order(order, split_items)

                from apps.orders.serializers import OrderDetailSerializer
                return Response({
                    'original_order': OrderDetailSerializer(order).data,
                    'new_order': OrderDetailSerializer(new_order).data
                })

            except Order.DoesNotExist:
                return Response(
                    {'error': '订单不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def merge_orders(self, request):
        """合并订单"""
        serializer = OrderMergeSerializer(data=request.data)

        if serializer.is_valid():
            main_order_id = serializer.validated_data['main_order_id']
            merge_order_ids = serializer.validated_data['merge_order_ids']

            from apps.orders.models import Order
            try:
                main_order = Order.objects.get(id=main_order_id, shop=request.tenant)
                pos_service = POSService(request.tenant)
                merged_order = pos_service.merge_orders(main_order, merge_order_ids)

                from apps.orders.serializers import OrderDetailSerializer
                return Response(OrderDetailSerializer(merged_order).data)

            except Order.DoesNotExist:
                return Response(
                    {'error': '主订单不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TableManagementViewSet(ModelViewSet):
    """桌台管理视图"""
    permission_classes = [IsShopOwnerOrStaff]

    @action(detail=False, methods=['get'])
    def status(self, request):
        """获取所有桌台状态"""
        table_service = TableManagementService(request.tenant)
        table_status = table_service.get_table_status()
        return Response(table_status)

    @action(detail=False, methods=['post'])
    def update_status(self, request):
        """更新桌台状态"""
        serializer = TableStatusSerializer(data=request.data)

        if serializer.is_valid():
            table_id = serializer.validated_data['table_id']
            status = serializer.validated_data['status']
            order_id = serializer.validated_data.get('order_id')

            table_service = TableManagementService(request.tenant)
            success = table_service.update_table_status(table_id, status, order_id)

            if success:
                return Response({'message': '桌台状态更新成功'})
            else:
                return Response(
                    {'error': '桌台或订单不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """获取可用桌台"""
        capacity = request.GET.get('capacity')
        if capacity:
            try:
                capacity = int(capacity)
            except ValueError:
                capacity = None

        table_service = TableManagementService(request.tenant)
        available_tables = table_service.get_available_tables(capacity)

        from apps.shops.serializers import TableSerializer
        serializer = TableSerializer(available_tables, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsShopOwnerOrStaff])
def pos_dashboard(request):
    """POS仪表板"""
    today = timezone.now().date()
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
    today_end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))

    from apps.orders.models import Order
    from apps.shops.models import Table

    # 今日订单统计
    today_orders = Order.objects.filter(
        shop=request.tenant,
        created_at__range=[today_start, today_end]
    )

    # 桌台状态统计
    tables = Table.objects.filter(shop=request.tenant, is_active=True)
    table_stats = {
        'total': tables.count(),
        'available': tables.filter(status='available').count(),
        'occupied': tables.filter(status='occupied').count(),
        'reserved': tables.filter(status='reserved').count(),
        'cleaning': tables.filter(status='cleaning').count()
    }

    # 支付方式统计
    payment_stats = today_orders.filter(payment_status=True).values('payment_method').annotate(
        total_amount=Sum('total_amount'),
        order_count=Count('id')
    )

    # 热门商品
    from apps.orders.models import OrderItem
    popular_products = OrderItem.objects.filter(
        order__shop=request.tenant,
        order__created_at__range=[today_start, today_end]
    ).values('product_name').annotate(
        total_quantity=Sum('quantity')
    ).order_by('-total_quantity')[:10]

    dashboard_data = {
        'today_stats': {
            'total_orders': today_orders.count(),
            'total_revenue': today_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'completed_orders': today_orders.filter(status='completed').count(),
            'pending_orders': today_orders.filter(status__in=['pending', 'confirmed', 'preparing']).count(),
        },
        'table_stats': table_stats,
        'payment_stats': list(payment_stats),
        'popular_products': list(popular_products)
    }

    return Response(dashboard_data)


@api_view(['GET'])
@permission_classes([IsShopOwnerOrStaff])
def pos_statistics(request):
    """POS统计报表"""
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    from apps.orders.models import Order

    orders = Order.objects.filter(shop=request.tenant, payment_status=True)

    if start_date:
        orders = orders.filter(created_at__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__lte=end_date)

    # 按日期分组统计
    daily_stats = orders.extra(
        {'date': "DATE(created_at)"}
    ).values('date').annotate(
        total_orders=Count('id'),
        total_revenue=Sum('total_amount'),
        average_order_value=Sum('total_amount') / Count('id')
    ).order_by('date')

    # 支付方式统计
    payment_stats = orders.values('payment_method').annotate(
        total_amount=Sum('total_amount'),
        order_count=Count('id')
    )

    # 订单类型统计
    order_type_stats = orders.values('order_type').annotate(
        total_amount=Sum('total_amount'),
        order_count=Count('id')
    )

    return Response({
        'daily_stats': list(daily_stats),
        'payment_stats': list(payment_stats),
        'order_type_stats': list(order_type_stats)
    })


@api_view(['POST'])
@permission_classes([IsShopOwnerOrStaff])
def start_cashier_shift(request):
    """开始收银班次"""
    serializer = CashierShiftSerializer(data=request.data)

    if serializer.is_valid():
        # 这里实现班次开始逻辑
        # 可以记录收银员、开始时间、起始金额等

        shift_data = {
            'shift_number': serializer.validated_data['shift_number'],
            'cashier_id': serializer.validated_data['cashier_id'],
            'start_amount': serializer.validated_data['start_amount'],
            'start_time': timezone.now(),
            'status': 'active'
        }

        # 保存班次信息到数据库或缓存

        return Response({
            'message': '班次开始成功',
            'shift_data': shift_data
        })

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsShopOwnerOrStaff])
def end_cashier_shift(request):
    """结束收银班次"""
    shift_number = request.data.get('shift_number')
    end_amount = request.data.get('end_amount')
    notes = request.data.get('notes', '')

    if not shift_number or not end_amount:
        return Response(
            {'error': '班次号和结束金额不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 这里实现班次结束逻辑
    # 计算现金差异、生成报表等

    end_data = {
        'shift_number': shift_number,
        'end_amount': end_amount,
        'end_time': timezone.now(),
        'notes': notes,
        'status': 'completed'
    }

    return Response({
        'message': '班次结束成功',
        'end_data': end_data
    })