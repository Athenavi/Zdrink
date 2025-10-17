from django.contrib import admin

from .models import Printer, PrintTemplate, PrintTask, PrintLog


@admin.register(Printer)
class PrinterAdmin(admin.ModelAdmin):
    list_display = ['name', 'printer_type', 'brand', 'shop', 'is_online', 'is_active']
    list_filter = ['printer_type', 'brand', 'is_online', 'is_active', 'shop']
    search_fields = ['name', 'device_no']

    actions = ['test_connection']

    def test_connection(self, request, queryset):
        for printer in queryset:
            from .services import PrintServiceFactory
            service = PrintServiceFactory.get_service(printer)
            result = service.get_printer_status()

            if result['success']:
                self.message_user(request, f"{printer.name}: 连接正常")
            else:
                self.message_user(request, f"{printer.name}: 连接失败 - {result['message']}", level='error')

    test_connection.short_description = "测试打印机连接"


@admin.register(PrintTemplate)
class PrintTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'shop', 'is_default', 'is_active']
    list_filter = ['template_type', 'is_default', 'is_active', 'shop']
    search_fields = ['name']


@admin.register(PrintTask)
class PrintTaskAdmin(admin.ModelAdmin):
    list_display = ['task_id', 'printer', 'status', 'copies', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['task_id', 'printer__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PrintLog)
class PrintLogAdmin(admin.ModelAdmin):
    list_display = ['printer', 'content_type', 'reference_id', 'is_success', 'created_at']
    list_filter = ['content_type', 'is_success', 'created_at']
    search_fields = ['printer__name', 'reference_id']
    readonly_fields = ['created_at']