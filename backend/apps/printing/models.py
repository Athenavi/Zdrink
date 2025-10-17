from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Printer(models.Model):
    """打印机配置"""
    PRINTER_TYPE_CHOICES = (
        ('usb', 'USB打印机'),
        ('network', '网络打印机'),
        ('cloud', '云打印机'),
        ('bluetooth', '蓝牙打印机'),
    )

    PRINTER_BRAND_CHOICES = (
        ('feie', '飞鹅云打印'),
        ('yilianyun', '易联云'),
        ('xinjie', '芯烨'),
        ('custom', '自定义'),
    )

    name = models.CharField(max_length=100, verbose_name='打印机名称')
    printer_type = models.CharField(max_length=20, choices=PRINTER_TYPE_CHOICES, default='cloud')
    brand = models.CharField(max_length=20, choices=PRINTER_BRAND_CHOICES, default='feie')

    # 打印机配置
    device_no = models.CharField(max_length=100, verbose_name='设备编号')
    device_key = models.CharField(max_length=100, blank=True, verbose_name='设备密钥')

    # 连接配置
    connection_string = models.CharField(max_length=500, blank=True, verbose_name='连接字符串')
    ip_address = models.CharField(max_length=50, blank=True, verbose_name='IP地址')
    port = models.IntegerField(default=9100, verbose_name='端口')

    # 打印设置
    paper_width = models.IntegerField(default=80, verbose_name='纸张宽度(mm)')
    copies = models.IntegerField(default=1, verbose_name='打印份数')
    auto_print = models.BooleanField(default=True, verbose_name='自动打印')

    # 打印内容配置
    print_header = models.BooleanField(default=True, verbose_name='打印抬头')
    print_footer = models.BooleanField(default=True, verbose_name='打印页脚')
    print_qrcode = models.BooleanField(default=True, verbose_name='打印二维码')

    # 状态
    is_online = models.BooleanField(default=False, verbose_name='在线状态')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='printers')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'printers'
        verbose_name = '打印机'
        verbose_name_plural = '打印机'

    def __str__(self):
        return f"{self.name} - {self.shop.name}"


class PrintTemplate(models.Model):
    """打印模板"""
    TEMPLATE_TYPE_CHOICES = (
        ('order', '订单小票'),
        ('kitchen', '厨房单'),
        ('receipt', '收据'),
        ('label', '标签'),
    )

    name = models.CharField(max_length=100, verbose_name='模板名称')
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES, default='order')

    # 模板内容
    header_template = models.TextField(blank=True, verbose_name='抬头模板')
    content_template = models.TextField(verbose_name='内容模板')
    footer_template = models.TextField(blank=True, verbose_name='页脚模板')

    # 样式配置
    font_size = models.IntegerField(default=14, verbose_name='字体大小')
    line_spacing = models.IntegerField(default=1, verbose_name='行间距')
    margin_top = models.IntegerField(default=5, verbose_name='上边距')
    margin_bottom = models.IntegerField(default=5, verbose_name='下边距')

    # 是否默认模板
    is_default = models.BooleanField(default=False, verbose_name='默认模板')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    # 多租户关联
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='print_templates')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'print_templates'
        verbose_name = '打印模板'
        verbose_name_plural = '打印模板'
        unique_together = ['shop', 'template_type', 'is_default']

    def __str__(self):
        return f"{self.name} - {self.shop.name}"


class PrintTask(models.Model):
    """打印任务"""
    STATUS_CHOICES = (
        ('pending', '等待打印'),
        ('printing', '打印中'),
        ('completed', '打印完成'),
        ('failed', '打印失败'),
    )

    task_id = models.CharField(max_length=100, unique=True, verbose_name='任务ID')
    printer = models.ForeignKey(Printer, on_delete=models.CASCADE, related_name='print_tasks')
    template = models.ForeignKey(PrintTemplate, on_delete=models.CASCADE, related_name='print_tasks')

    # 打印内容
    content_data = models.JSONField(default=dict, verbose_name='打印数据')
    print_content = models.TextField(verbose_name='打印内容')

    # 任务状态
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    copies = models.IntegerField(default=1, verbose_name='打印份数')

    # 错误信息
    error_message = models.TextField(blank=True, verbose_name='错误信息')
    retry_count = models.IntegerField(default=0, verbose_name='重试次数')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    printed_at = models.DateTimeField(null=True, blank=True, verbose_name='打印时间')

    class Meta:
        db_table = 'print_tasks'
        verbose_name = '打印任务'
        verbose_name_plural = '打印任务'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task_id} - {self.printer.name}"


class PrintLog(models.Model):
    """打印日志"""
    printer = models.ForeignKey(Printer, on_delete=models.CASCADE, related_name='print_logs')
    task = models.ForeignKey(PrintTask, on_delete=models.CASCADE, related_name='print_logs', null=True, blank=True)

    # 打印内容
    content_type = models.CharField(max_length=50, verbose_name='内容类型')
    reference_id = models.CharField(max_length=100, verbose_name='关联ID')
    print_content = models.TextField(verbose_name='打印内容')

    # 打印结果
    is_success = models.BooleanField(default=False, verbose_name='是否成功')
    copies = models.IntegerField(default=1, verbose_name='打印份数')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'print_logs'
        verbose_name = '打印日志'
        verbose_name_plural = '打印日志'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.printer.name} - {self.content_type} - {self.created_at}"