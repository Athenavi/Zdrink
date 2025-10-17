import csv

from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import (
    Category, Product, Specification, ProductSKU, InventoryLog
)
from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, SpecificationSerializer, ProductSKUSerializer, InventoryLogSerializer,
    StockAdjustmentSerializer, BulkStockUpdateSerializer, ProductExportSerializer
)


class CategoryViewSet(ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['sort_order', 'name', 'created_at']

    def get_queryset(self):
        return Category.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class ProductViewSet(ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['sort_order', 'name', 'base_price', 'created_at']
    filterset_fields = ['category', 'status', 'is_featured']

    def get_queryset(self):
        queryset = Product.objects.filter(shop=self.request.tenant).select_related(
            'category', 'created_by'
        ).prefetch_related(
            'skus', 'attributes', 'product_images'
        )

        # 根据action优化查询
        if self.action == 'list':
            return queryset.only(
                'id', 'name', 'category', 'base_price', 'main_image',
                'status', 'is_featured', 'sort_order', 'created_at'
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant, created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def export(self, request):
        """导出商品数据"""
        products = self.get_queryset()
        serializer = ProductExportSerializer(products, many=True)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="products_export.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', '商品名称', '分类', '基础价格', '状态', 'SKU数量', '总库存', '创建时间'])

        for product in serializer.data:
            writer.writerow([
                product['id'],
                product['name'],
                product['category_name'],
                product['base_price'],
                product['status'],
                product['sku_count'],
                product['total_stock'],
                product['created_at'],
            ])

        return response

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """复制商品"""
        product = self.get_object()

        # 复制商品基本信息
        product.pk = None
        product.name = f"{product.name} (副本)"
        product.status = 'draft'
        product.save()

        # 复制SKU
        for sku in product.skus.all():
            sku.pk = None
            sku.product = product
            sku.save()

        # 复制属性
        for attribute in product.attributes.all():
            attribute.pk = None
            attribute.product = product
            attribute.save()

        serializer = ProductDetailSerializer(product)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SpecificationViewSet(ModelViewSet):
    serializer_class = SpecificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'display_name']
    ordering_fields = ['sort_order', 'name']

    def get_queryset(self):
        return Specification.objects.filter(shop=self.request.tenant).prefetch_related('values')

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class ProductSKUViewSet(ModelViewSet):
    serializer_class = ProductSKUSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['product', 'is_active']
    search_fields = ['sku_code', 'product__name']

    def get_queryset(self):
        return ProductSKU.objects.filter(product__shop=self.request.tenant).select_related(
            'product'
        ).prefetch_related('specifications')

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """调整库存"""
        sku = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)

        if serializer.is_valid():
            adjustment_type = serializer.validated_data['adjustment_type']
            quantity = serializer.validated_data['quantity']
            notes = serializer.validated_data.get('notes', '')

            with transaction.atomic():
                if adjustment_type == 'increase':
                    sku.stock_quantity += quantity
                    action_type = 'adjustment'
                else:
                    sku.stock_quantity = max(0, sku.stock_quantity - quantity)
                    action_type = 'adjustment'

                sku.save()

                # 记录库存日志
                InventoryLog.objects.create(
                    sku=sku,
                    action=action_type,
                    quantity_change=quantity if adjustment_type == 'increase' else -quantity,
                    current_quantity=sku.stock_quantity,
                    notes=notes,
                    created_by=request.user
                )

            return Response({'message': '库存调整成功', 'current_stock': sku.stock_quantity})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryLogView(generics.ListAPIView):
    serializer_class = InventoryLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['sku', 'action']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return InventoryLog.objects.filter(sku__product__shop=self.request.tenant).select_related(
            'sku', 'created_by'
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_stock_update(request):
    """批量更新库存"""
    serializer = BulkStockUpdateSerializer(data=request.data)

    if serializer.is_valid():
        updates = serializer.validated_data['updates']
        results = []

        with transaction.atomic():
            for update in updates:
                try:
                    sku = ProductSKU.objects.get(
                        id=update['sku_id'],
                        product__shop=request.tenant
                    )

                    old_stock = sku.stock_quantity
                    sku.stock_quantity = update['stock_quantity']
                    sku.save()

                    # 记录库存变更
                    if old_stock != update['stock_quantity']:
                        InventoryLog.objects.create(
                            sku=sku,
                            action='adjustment',
                            quantity_change=update['stock_quantity'] - old_stock,
                            current_quantity=update['stock_quantity'],
                            notes=update.get('notes', '批量更新'),
                            created_by=request.user
                        )

                    results.append({
                        'sku_id': update['sku_id'],
                        'success': True,
                        'current_stock': sku.stock_quantity
                    })

                except ProductSKU.DoesNotExist:
                    results.append({
                        'sku_id': update['sku_id'],
                        'success': False,
                        'error': 'SKU不存在'
                    })

        return Response({'results': results})

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def low_stock_alert(request):
    """低库存预警"""
    low_stock_skus = ProductSKU.objects.filter(
        product__shop=request.tenant,
        stock_quantity__lte=models.F('low_stock_threshold'),
        stock_quantity__gt=0
    ).select_related('product')

    serializer = ProductSKUSerializer(low_stock_skus, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_products(request):
    """公开商品列表（供小程序/H5使用）"""
    products = Product.objects.filter(
        shop=request.tenant,
        status='active'
    ).select_related('category').prefetch_related(
        Prefetch('skus', queryset=ProductSKU.objects.filter(is_active=True))
    ).only(
        'id', 'name', 'category', 'base_price', 'main_image',
        'description', 'preparation_time'
    )

    # 过滤条件
    category_id = request.GET.get('category_id')
    if category_id:
        products = products.filter(category_id=category_id)

    search = request.GET.get('search')
    if search:
        products = products.filter(name__icontains=search)

    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)