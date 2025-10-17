import uuid

from apps.core.permissions import IsShopOwnerOrStaff
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Printer, PrintTemplate, PrintTask, PrintLog
from .serializers import (
    PrinterSerializer, PrintTemplateSerializer, PrintTaskSerializer,
    PrintLogSerializer, PrintOrderSerializer, TestPrintSerializer
)
from .services import PrintServiceFactory, PrintContentGenerator


class PrinterViewSet(ModelViewSet):
    """打印机管理"""
    serializer_class = PrinterSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return Printer.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)

    @action(detail=True, methods=['post'])
    def test_print(self, request, pk=None):
        """测试打印"""
        printer = self.get_object()
        serializer = TestPrintSerializer(data=request.data)

        if serializer.is_valid():
            content = serializer.validated_data['content']

            print_service = PrintServiceFactory.get_service(printer)
            result = print_service.print_text(content)

            # 记录打印日志
            PrintLog.objects.create(
                printer=printer,
                content_type='test',
                reference_id='test',
                print_content=content,
                is_success=result['success'],
                copies=1
            )

            return Response(result)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """获取打印机状态"""
        printer = self.get_object()

        print_service = PrintServiceFactory.get_service(printer)
        result = print_service.get_printer_status()

        if result['success']:
            # 更新打印机状态
            printer.is_online = (result['status'] == 'online')
            printer.save()

        return Response(result)

    @action(detail=False, methods=['get'])
    def status_all(self, request):
        """获取所有打印机状态"""
        printers = self.get_queryset()
        results = []

        for printer in printers:
            print_service = PrintServiceFactory.get_service(printer)
            status_result = print_service.get_printer_status()

            results.append({
                'printer_id': printer.id,
                'printer_name': printer.name,
                'status': status_result
            })

        return Response(results)


class PrintTemplateViewSet(ModelViewSet):
    """打印模板管理"""
    serializer_class = PrintTemplateSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return PrintTemplate.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        # 如果设置为默认模板，取消其他同类型模板的默认状态
        if serializer.validated_data.get('is_default', False):
            PrintTemplate.objects.filter(
                shop=self.request.tenant,
                template_type=serializer.validated_data['template_type']
            ).update(is_default=False)

        serializer.save(shop=self.request.tenant)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """设置为默认模板"""
        template = self.get_object()

        with transaction.atomic():
            # 取消同类型其他模板的默认状态
            PrintTemplate.objects.filter(
                shop=request.tenant,
                template_type=template.template_type
            ).update(is_default=False)

            # 设置当前模板为默认
            template.is_default = True
            template.save()

        return Response({'message': '已设置为默认模板'})


class PrintTaskViewSet(ModelViewSet):
    """打印任务管理"""
    serializer_class = PrintTaskSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return PrintTask.objects.filter(printer__shop=self.request.tenant).select_related('printer', 'template')

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """重试打印任务"""
        task = self.get_object()

        if task.status not in ['failed', 'pending']:
            return Response(
                {'error': '只能重试失败或等待中的任务'},
                status=status.HTTP_400_BAD_REQUEST
            )

        print_service = PrintServiceFactory.get_service(task.printer)
        result = print_service.print_text(task.print_content, task.copies)

        if result['success']:
            task.status = 'completed'
            task.printed_at = timezone.now()
            task.error_message = ''
        else:
            task.status = 'failed'
            task.error_message = result['message']
            task.retry_count += 1

        task.save()

        return Response({
            'success': result['success'],
            'message': result['message']
        })


class PrintLogView(generics.ListAPIView):
    """打印日志"""
    serializer_class = PrintLogSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return PrintLog.objects.filter(printer__shop=self.request.tenant).select_related('printer')


@api_view(['POST'])
@permission_classes([IsShopOwnerOrStaff])
def print_order(request):
    """打印订单"""
    serializer = PrintOrderSerializer(data=request.data)

    if serializer.is_valid():
        order_id = serializer.validated_data['order_id']
        printer_id = serializer.validated_data['printer_id']
        template_id = serializer.validated_data.get('template_id')
        copies = serializer.validated_data['copies']
        print_type = serializer.validated_data['print_type']

        # 获取订单
        from apps.orders.models import Order
        try:
            order = Order.objects.get(id=order_id, shop=request.tenant)
        except Order.DoesNotExist:
            return Response(
                {'error': '订单不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 获取打印机
        try:
            printer = Printer.objects.get(id=printer_id, shop=request.tenant)
        except Printer.DoesNotExist:
            return Response(
                {'error': '打印机不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 获取模板
        template = None
        if template_id:
            try:
                template = PrintTemplate.objects.get(id=template_id, shop=request.tenant)
            except PrintTemplate.DoesNotExist:
                pass

        if not template:
            # 获取默认模板
            template = PrintTemplate.objects.filter(
                shop=request.tenant,
                template_type='order',
                is_default=True,
                is_active=True
            ).first()

        print_service = PrintServiceFactory.get_service(printer)
        results = []

        # 生成任务ID
        task_id = f"TASK{int(time.time())}{uuid.uuid4().hex[:6].upper()}"

        try:
            # 打印订单小票
            if print_type in ['order', 'both']:
                order_content = PrintContentGenerator.generate_order_content(order, template)
                result = print_service.print_text(order_content, copies)

                # 创建打印任务
                print_task = PrintTask.objects.create(
                    task_id=task_id,
                    printer=printer,
                    template=template,
                    content_data={'order_id': order_id, 'print_type': 'order'},
                    print_content=order_content,
                    copies=copies,
                    status='completed' if result['success'] else 'failed',
                    printed_at=timezone.now() if result['success'] else None,
                    error_message='' if result['success'] else result.get('message', '打印失败')
                )

                # 记录打印日志
                PrintLog.objects.create(
                    printer=printer,
                    task=print_task,
                    content_type='order',
                    reference_id=order.order_number,
                    print_content=order_content,
                    is_success=result['success'],
                    copies=copies
                )

                results.append({
                    'type': 'order',
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'task_id': task_id
                })

            # 打印厨房单
            if print_type in ['kitchen', 'both']:
                kitchen_content = PrintContentGenerator.generate_kitchen_content(order)
                result = print_service.print_text(kitchen_content, 1)  # 厨房单通常只打印一份

                # 创建厨房单打印任务
                kitchen_task_id = f"{task_id}_KITCHEN"
                print_task = PrintTask.objects.create(
                    task_id=kitchen_task_id,
                    printer=printer,
                    template=template,
                    content_data={'order_id': order_id, 'print_type': 'kitchen'},
                    print_content=kitchen_content,
                    copies=1,
                    status='completed' if result['success'] else 'failed',
                    printed_at=timezone.now() if result['success'] else None,
                    error_message='' if result['success'] else result.get('message', '打印失败')
                )

                # 记录打印日志
                PrintLog.objects.create(
                    printer=printer,
                    task=print_task,
                    content_type='kitchen',
                    reference_id=order.order_number,
                    print_content=kitchen_content,
                    is_success=result['success'],
                    copies=1
                )

                results.append({
                    'type': 'kitchen',
                    'success': result['success'],
                    'message': result.get('message', ''),
                    'task_id': kitchen_task_id
                })

            return Response({
                'order_number': order.order_number,
                'results': results
            })

        except Exception as e:
            return Response(
                {'error': f'打印异常: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsShopOwnerOrStaff])
def auto_print_order(request, order_id):
    """自动打印订单（订单状态变更时调用）"""
    try:
        from apps.orders.models import Order
        order = Order.objects.get(id=order_id, shop=request.tenant)

        # 获取配置了自动打印的打印机
        auto_printers = Printer.objects.filter(
            shop=request.tenant,
            auto_print=True,
            is_active=True
        )

        if not auto_printers.exists():
            return Response({'message': '没有配置自动打印的打印机'})

        results = []

        for printer in auto_printers:
            # 获取默认模板
            template = PrintTemplate.objects.filter(
                shop=request.tenant,
                template_type='order',
                is_default=True,
                is_active=True
            ).first()

            print_service = PrintServiceFactory.get_service(printer)
            order_content = PrintContentGenerator.generate_order_content(order, template)
            result = print_service.print_text(order_content, 1)

            # 记录日志
            PrintLog.objects.create(
                printer=printer,
                content_type='auto_order',
                reference_id=order.order_number,
                print_content=order_content,
                is_success=result['success'],
                copies=1
            )

            results.append({
                'printer': printer.name,
                'success': result['success'],
                'message': result.get('message', '')
            })

        return Response({'results': results})

    except Order.DoesNotExist:
        return Response(
            {'error': '订单不存在'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsShopOwnerOrStaff])
def print_statistics(request):
    """打印统计"""
    today = timezone.now().date()
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

    # 今日打印统计
    today_logs = PrintLog.objects.filter(
        printer__shop=request.tenant,
        created_at__gte=today_start
    )

    stats = {
        'today_total_prints': today_logs.count(),
        'today_success_prints': today_logs.filter(is_success=True).count(),
        'today_failed_prints': today_logs.filter(is_success=False).count(),
        'printers_status': []
    }

    # 各打印机状态
    printers = Printer.objects.filter(shop=request.tenant)
    for printer in printers:
        printer_stats = {
            'printer_id': printer.id,
            'printer_name': printer.name,
            'is_online': printer.is_online,
            'today_prints': today_logs.filter(printer=printer).count(),
            'success_rate': 0
        }

        success_count = today_logs.filter(printer=printer, is_success=True).count()
        total_count = printer_stats['today_prints']

        if total_count > 0:
            printer_stats['success_rate'] = round(success_count / total_count * 100, 2)

        stats['printers_status'].append(printer_stats)

    return Response(stats)