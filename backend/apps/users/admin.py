from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'phone', 'user_type', 'is_active', 'date_joined']
    list_filter = ['user_type', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'phone']
    ordering = ['-date_joined',]

    fieldsets = UserAdmin.fieldsets + (
        ('自定义信息', {
            'fields': ('user_type', 'phone', 'avatar', 'points')
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('自定义信息', {
            'fields': ('user_type', 'phone', 'email')
        }),
    )


from .models import MembershipLevelConfig, PointsLog, PointsRule, MemberRecharge


@admin.register(MembershipLevelConfig)
class MembershipLevelConfigAdmin(admin.ModelAdmin):
    list_display = ['level', 'name', 'shop', 'min_points', 'discount_rate', 'is_active']
    list_filter = ['level', 'is_active', 'shop']
    search_fields = ['name']


@admin.register(PointsRule)
class PointsRuleAdmin(admin.ModelAdmin):
    list_display = ['rule_type', 'name', 'shop', 'is_active']
    list_filter = ['rule_type', 'is_active', 'shop']
    search_fields = ['name']


@admin.register(PointsLog)
class PointsLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'points_type', 'points', 'current_points', 'created_at']
    list_filter = ['points_type', 'created_at', 'shop']
    search_fields = ['user__username']
    readonly_fields = ['created_at']


@admin.register(MemberRecharge)
class MemberRechargeAdmin(admin.ModelAdmin):
    list_display = ['user', 'recharge_amount', 'gift_amount', 'payment_status', 'created_at']
    list_filter = ['payment_status', 'created_at', 'shop']
    search_fields = ['user__username']


from .models import SocialLoginConfig


@admin.register(SocialLoginConfig)
class SocialLoginConfigAdmin(admin.ModelAdmin):
    list_display = ['weixin_app_id', 'alipay_app_id', 'is_active', 'updated_at']
    fieldsets = (
        ('微信登录配置', {
            'fields': ('weixin_app_id', 'weixin_app_secret', 'weixin_scope'),
        }),
        ('支付宝登录配置', {
            'fields': ('alipay_app_id', 'alipay_private_key', 'alipay_public_key', 'alipay_scope'),
        }),
        ('控制', {
            'fields': ('is_active',),
        }),
    )

    # 单例配置，不显示添加按钮
    def has_add_permission(self, request):
        if SocialLoginConfig.objects.exists():
            return False
        return True


from .models import VerifyCode, VerifyConfig, CaptchaConfig, StorageConfig, DnsProviderConfig


@admin.register(VerifyConfig)
class VerifyConfigAdmin(admin.ModelAdmin):
    list_display = ['login_mode', 'sms_provider', 'is_active', 'updated_at']
    fieldsets = (
        ('启用控制', {
            'fields': ('is_active', 'login_mode', 'enable_phone_login', 'enable_email_login'),
        }),
        ('验证码参数', {
            'fields': ('code_length', 'code_expire_seconds'),
        }),
        ('短信服务（阿里云）', {
            'fields': (
                'sms_provider', 'aliyun_access_key', 'aliyun_secret_key',
                'aliyun_sign_name', 'aliyun_template_code'
            ),
            'description': '选择「阿里云短信」时需填写以下参数',
        }),
        ('短信服务（腾讯云）', {
            'fields': (
                'tencent_secret_id', 'tencent_secret_key', 'tencent_sdk_app_id',
                'tencent_sign_name', 'tencent_template_code'
            ),
            'description': '选择「腾讯云短信」时需填写以下参数',
        }),
        ('邮件服务（SMTP）', {
            'fields': (
                'email_host', 'email_port', 'email_host_user', 'email_host_password',
                'email_use_tls', 'email_use_ssl', 'email_from'
            ),
        }),
    )

    def has_add_permission(self, request):
        if VerifyConfig.objects.exists():
            return False
        return True


@admin.register(CaptchaConfig)
class CaptchaConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'is_active', 'updated_at']
    fieldsets = (
        ('基本设置', {
            'fields': ('provider', 'is_active'),
        }),
        ('极验 GEETEST v4', {
            'fields': ('geetest_captcha_id', 'geetest_captcha_key'),
        }),
        ('腾讯云验证码', {
            'fields': ('tencent_app_id', 'tencent_secret_key'),
        }),
        ('阿里云验证码', {
            'fields': ('aliyun_app_key', 'aliyun_secret_key'),
        }),
        ('顶象验证码', {
            'fields': ('dingxiang_app_id', 'dingxiang_app_secret'),
        }),
        ('网易易盾验证码', {
            'fields': ('netease_captcha_id', 'netease_secret_key'),
        }),
    )

    def has_add_permission(self, request):
        if CaptchaConfig.objects.exists():
            return False
        return True


@admin.register(VerifyCode)
class VerifyCodeAdmin(admin.ModelAdmin):
    list_display = ['phone', 'email', 'code', 'purpose', 'is_used', 'created_at']
    list_filter = ['purpose', 'is_used', 'created_at']
    search_fields = ['phone', 'email']
    readonly_fields = ['phone', 'email', 'code', 'purpose', 'expires_at', 'created_at']
    list_per_page = 50

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(StorageConfig)
class StorageConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'is_active', 'bucket', 'base_url', 'updated_at']
    fieldsets = (
        ('基本设置', {
            'fields': ('provider', 'is_active', 'bucket', 'region', 'base_url', 'path_prefix'),
        }),
        ('阿里云 OSS', {
            'fields': ('aliyun_access_key', 'aliyun_secret_key'),
            'description': '选择「阿里云 OSS」时需填写以下参数',
        }),
        ('腾讯云 COS', {
            'fields': ('tencent_secret_id', 'tencent_secret_key'),
            'description': '选择「腾讯云 COS」时需填写以下参数',
        }),
        ('七牛云 Kodo', {
            'fields': ('qiniu_access_key', 'qiniu_secret_key'),
            'description': '选择「七牛云 Kodo」时需填写以下参数',
        }),
    )

    def has_add_permission(self, request):
        if StorageConfig.objects.exists():
            return False
        return True


@admin.register(DnsProviderConfig)
class DnsProviderConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'is_active', 'domain_suffix', 'updated_at']
    fieldsets = (
        ('基本设置', {
            'fields': ('provider', 'is_active', 'domain_suffix'),
            'description': '配置根域名和DNS服务商后，系统可在分配域名时自动添加解析记录。例如根域名 yourdomain.com，店铺将获得 shop-3.yourdomain.com。',
        }),
        ('腾讯云 DNSPod', {
            'fields': ('dnspod_secret_id', 'dnspod_secret_key'),
            'description': '选择「腾讯云 DNSPod」时需填写以下参数',
        }),
        ('阿里云 DNS', {
            'fields': ('aliyun_access_key', 'aliyun_secret_key'),
            'description': '选择「阿里云 DNS」时需填写以下参数',
        }),
    )

    def has_add_permission(self, request):
        if DnsProviderConfig.objects.exists():
            return False
        return True
