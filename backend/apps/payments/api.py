from apps.core.permissions import IsShopOwnerOrStaff, HasShopPermission
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import PaymentMethod, PaymentTransaction, RefundRequest, WechatPayConfig, AlipayConfig
from .serializers import (
    PaymentMethodSerializer, PaymentTransactionSerializer, CreatePaymentSerializer,
    RefundRequestSerializer, WechatPayConfigSerializer, AlipayConfigSerializer
)
from .services import PaymentServiceFactory


class PaymentMethodViewSet(ModelViewSet):
    """支付方式管理"""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return PaymentMethod.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class PaymentTransactionViewSet(ModelViewSet):
    """支付交易管理"""
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsShopOwnerOrStaff]
    filter_backends = []

    def get_queryset(self):
        return PaymentTransaction.objects.filter(
            order__shop=self.request.tenant
        ).select_related('order', 'payment_method')

    @action(detail=False, methods=['post'])
    def create_payment(self, request):
        """创建支付"""
        serializer = CreatePaymentSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            order = serializer.validated_data['order']
            payment_method = serializer.validated_data['payment_method']

            # 检查订单状态
            if order.status != 'pending':
                return Response(
                    {'error': '订单状态不允许支付'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # 创建支付交易记录
                payment_transaction = PaymentTransaction.objects.create(
                    order=order,
                    payment_method=payment_method,
                    out_trade_no=order.order_number,
                    amount=order.total_amount
                )

                # 调用支付服务
                try:
                    payment_service = PaymentServiceFactory.get_service(payment_method)
                    payment_result = payment_service.create_payment(order, request)

                    # 更新支付数据
                    payment_transaction.payment_data = payment_result
                    payment_transaction.save()

                    return Response({
                        'transaction_id': payment_transaction.id,
                        'transaction_no': payment_transaction.transaction_no,
                        'payment_data': payment_result
                    })

                except Exception as e:
                    payment_transaction.status = 'failed'
                    payment_transaction.save()
                    return Response(
                        {'error': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """退款"""
        payment_transaction = self.get_object()
        refund_amount = request.data.get('refund_amount')
        reason = request.data.get('reason', '')

        if not refund_amount:
            return Response(
                {'error': '退款金额不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 验证退款金额
        if Decimal(refund_amount) > payment_transaction.amount - payment_transaction.refund_amount:
            return Response(
                {'error': '退款金额超过可退金额'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment_service = PaymentServiceFactory.get_service(payment_transaction.payment_method)
            refund_result = payment_service.refund(payment_transaction, Decimal(refund_amount), reason)

            # 更新退款信息
            payment_transaction.refund_amount += Decimal(refund_amount)
            if payment_transaction.refund_amount == payment_transaction.amount:
                payment_transaction.status = 'refunded'
                payment_transaction.refunded_at = timezone.now()
            payment_transaction.refund_data = refund_result
            payment_transaction.save()

            # 创建退款申请记录
            refund_request = RefundRequest.objects.create(
                transaction=payment_transaction,
                refund_amount=refund_amount,
                reason=reason,
                status='completed',
                handled_by=request.user,
                handled_at=timezone.now()
            )

            return Response({
                'message': '退款成功',
                'refund_no': refund_request.refund_no,
                'refund_amount': refund_amount
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class RefundRequestViewSet(ModelViewSet):
    """退款申请管理"""
    serializer_class = RefundRequestSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return RefundRequest.objects.filter(
            transaction__order__shop=self.request.tenant
        ).select_related('transaction', 'handled_by')

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """处理退款申请"""
        refund_request = self.get_object()
        action = request.data.get('action')  # approve or reject
        reason = request.data.get('reason', '')

        if action == 'approve':
            # 同意退款
            refund_request.status = 'approved'
            refund_request.handled_by = request.user
            refund_request.handled_at = timezone.now()
            refund_request.save()

            # 执行退款
            payment_service = PaymentServiceFactory.get_service(
                refund_request.transaction.payment_method
            )

            try:
                refund_result = payment_service.refund(
                    refund_request.transaction,
                    refund_request.refund_amount,
                    refund_request.reason
                )

                # 更新退款状态
                refund_request.status = 'completed'
                refund_request.save()

                # 更新交易状态
                transaction = refund_request.transaction
                transaction.refund_amount += refund_request.refund_amount
                if transaction.refund_amount == transaction.amount:
                    transaction.status = 'refunded'
                    transaction.refunded_at = timezone.now()
                transaction.save()

                return Response({'message': '退款处理成功'})

            except Exception as e:
                return Response(
                    {'error': f'退款执行失败: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif action == 'reject':
            # 拒绝退款
            refund_request.status = 'rejected'
            refund_request.handled_by = request.user
            refund_request.handled_at = timezone.now()
            refund_request.reject_reason = reason
            refund_request.save()

            return Response({'message': '退款申请已拒绝'})

        else:
            return Response(
                {'error': '无效的操作'},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@csrf_exempt
def wechat_pay_callback(request):
    """微信支付回调"""
    from .services import WechatPaymentService

    try:
        # 获取支付方式
        payment_method = PaymentMethod.objects.get(code='wechat', is_active=True)
        payment_service = WechatPaymentService(payment_method)

        # 处理回调
        success = payment_service.handle_callback(request)

        if success:
            return Response({'code': 'SUCCESS', 'message': 'OK'})
        else:
            return Response({'code': 'FAIL', 'message': '处理失败'}, status=400)

    except Exception as e:
        return Response({'code': 'FAIL', 'message': str(e)}, status=400)


@api_view(['POST'])
@csrf_exempt
def alipay_callback(request):
    """支付宝支付回调"""
    # 实现支付宝回调处理
    return Response('success')


class WechatPayConfigView(generics.RetrieveUpdateAPIView):
    """微信支付配置"""
    serializer_class = WechatPayConfigSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(WechatPayConfig, shop=self.request.tenant)


class AlipayConfigView(generics.RetrieveUpdateAPIView):
    """支付宝配置"""
    serializer_class = AlipayConfigSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_object(self):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(AlipayConfig, shop=self.request.tenant)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_statistics(request):
    """支付统计"""
    today = timezone.now().date()
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

    # 今日支付统计
    today_payments = PaymentTransaction.objects.filter(
        order__shop=request.tenant,
        created_at__gte=today_start,
        status='paid'
    )

    stats = {
        'today_total_amount': today_payments.aggregate(Sum('amount'))['amount__sum'] or 0,
        'today_payment_count': today_payments.count(),
        'payment_methods': today_payments.values('payment_method__name').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        )
    }

    return Response(stats)