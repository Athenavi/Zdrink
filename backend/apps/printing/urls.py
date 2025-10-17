from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    PrinterViewSet, PrintTemplateViewSet, PrintTaskViewSet,
    PrintLogView, print_order, auto_print_order, print_statistics
)

router = DefaultRouter()
router.register(r'printers', PrinterViewSet, basename='printer')
router.register(r'templates', PrintTemplateViewSet, basename='print-template')
router.register(r'tasks', PrintTaskViewSet, basename='print-task')

urlpatterns = [
    path('', include(router.urls)),
    path('logs/', PrintLogView.as_view(), name='print-logs'),
    path('print-order/', print_order, name='print-order'),
    path('auto-print-order/<int:order_id>/', auto_print_order, name='auto-print-order'),
    path('statistics/', print_statistics, name='print-statistics'),
]