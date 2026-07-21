"""商家入驻申请 API 视图"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .apply_serializers import ShopApplySerializer, ShopApplyListSerializer
from .models import ShopApply


class ShopApplyView(APIView):
    """入驻申请：提交（无需登录）/ 查询（需登录）"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # 默认禁用所有认证，post 无需登录

    def post(self, request):
        """提交入驻申请"""
        serializer = ShopApplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({'message': '入驻申请已提交，请等待审核'}, status=status.HTTP_201_CREATED)

    def get(self, request):
        """查询当前用户的入驻申请记录（需提供查询参数）"""
        phone = request.query_params.get('phone', '')
        email = request.query_params.get('email', '')

        if not phone and not email:
            return Response(
                {'error': '请提供 phone 或 email 参数查询申请记录'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = ShopApply.objects.all()
        if phone:
            qs = qs.filter(contact_phone=phone)
        if email:
            qs = qs.filter(contact_email=email)

        serializer = ShopApplyListSerializer(qs, many=True)
        return Response(serializer.data)
