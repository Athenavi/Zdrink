from rest_framework import serializers

from .models import Printer, PrintTemplate, PrintTask, PrintLog


class PrinterSerializer(serializers.ModelSerializer):
    status_info = serializers.SerializerMethodField()

    class Meta:
        model = Printer
        fields = '__all__'
        read_only_fields = ('shop', 'is_online')

    def get_status_info(self, obj):
        return {
            'is_online': obj.is_online,
            'last_check': obj.updated_at
        }


class PrintTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintTemplate
        fields = '__all__'
        read_only_fields = ('shop',)


class PrintTaskSerializer(serializers.ModelSerializer):
    printer_name = serializers.CharField(source='printer.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = PrintTask
        fields = '__all__'


class PrintLogSerializer(serializers.ModelSerializer):
    printer_name = serializers.CharField(source='printer.name', read_only=True)

    class Meta:
        model = PrintLog
        fields = '__all__'


class PrintOrderSerializer(serializers.Serializer):
    """打印订单序列化器"""
    order_id = serializers.IntegerField()
    printer_id = serializers.IntegerField()
    template_id = serializers.IntegerField(required=False)
    copies = serializers.IntegerField(default=1, min_value=1, max_value=10)
    print_type = serializers.ChoiceField(
        choices=[('order', '订单小票'), ('kitchen', '厨房单'), ('both', '两者都打印')],
        default='order'
    )


class TestPrintSerializer(serializers.Serializer):
    """测试打印序列化器"""
    printer_id = serializers.IntegerField()
    content = serializers.CharField(default="测试打印内容\n这是一行测试文本\n打印时间测试")


class PrinterStatusSerializer(serializers.Serializer):
    """打印机状态序列化器"""
    printer_id = serializers.IntegerField()