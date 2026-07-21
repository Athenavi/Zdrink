from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class CashierShift(models.Model):
    """收银班次"""
    STATUS_CHOICES = (
        ('active', '进行中'),
        ('completed', '已结束'),
    )

    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='cashier_shifts')
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name='收银员')
    shift_number = models.CharField(max_length=50, verbose_name='班次号')
    start_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='起始金额')
    end_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='结束金额')
    start_time = models.DateTimeField(auto_now_add=True, verbose_name='开始时间')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='结束时间')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name='状态')
    notes = models.TextField(blank=True, verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pos_cashier_shifts'
        verbose_name = '收银班次'
        verbose_name_plural = '收银班次'

    def __str__(self):
        return f'{self.shift_number} ({self.get_status_display()})'
