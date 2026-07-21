import os
from datetime import timedelta
from pathlib import Path

from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# 修复：添加ROOT_URLCONF配置
ROOT_URLCONF = 'zdrink_core.urls'

# 修复：添加WSGI配置
WSGI_APPLICATION = 'zdrink_core.wsgi.application'

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 第三方应用
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_extensions',
    'django_tenants',
    'drf_spectacular',
    'social_django',  # 第三方登录

    # 本地应用
    'apps.core',
    'apps.users',
    'apps.shops',
    'apps.products',
    'apps.orders',
    'apps.payments',
    'apps.printing',
    'apps.pos',
    'apps.promotions'
]

# 中间件配置
MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'apps.core.middleware.DisableCSRFMiddleware',  # 添加自定义中间件，禁用 API 的 CSRF（必须在 CsrfViewMiddleware 之前）
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 模板配置
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# 数据库配置
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': config('DB_NAME', default='zdrink'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# 多租户配置
SHARED_APPS = [
    'django_tenants',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'simpleui',  # 必须在 admin 之前
    'django.contrib.admin',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # refresh token 黑名单（跨租户共享）
    'corsheaders',
    'django_filters',
    'django_extensions',
    'drf_spectacular',

    'apps.core',
    'apps.users',
    'apps.shops',
]

TENANT_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',

    'apps.products',
    'apps.orders',
    'apps.payments',
    'apps.printing',
    'apps.pos',
    'apps.promotions',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

TENANT_MODEL = "shops.Shop"
TENANT_DOMAIN_MODEL = "shops.Domain"

# 密码验证
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# 国际化
LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = True

# 静态文件配置
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 默认主键类型
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 用户模型
AUTH_USER_MODEL = 'users.User'

# REST Framework配置
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '200/minute',
        'password_change': '3/hour',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# JWT 配置（保持不变）
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer', 'JWT'),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
}

# CORS 配置
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000'
).split(',')

# 允许的自定义请求头
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'referer',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant',  # 租户标识头
]

CORS_ALLOW_CREDENTIALS = True

# CSRF 配置
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000'
).split(',')

# Cookie 安全配置
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# 文件上传限制
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB

# API文档配置
SPECTACULAR_SETTINGS = {
    'TITLE': 'Zdrink API',
    'DESCRIPTION': 'Zdrink点餐系统API文档',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
# 租户配置
TENANT_LIMIT_SET_CALLS = True
# 未找到租户域名时，使用 public schema 继续处理（开发环境必需，生产环境也安全）
# 使得 /api/auth/* 等公共 API 在无租户上下文中也能正常工作
SHOW_PUBLIC_IF_NO_TENANT_FOUND = True

# 认证后端
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'guardian.backends.ObjectPermissionBackend',
)

# Guardian配置
ANONYMOUS_USER_NAME = None
GUARDIAN_GET_INIT_ANONYMOUS_USER = 'apps.users.models.get_anonymous_user_instance'

FEIE_USER = config('FEIE_USER', default='')
FEIE_UKEY = config('FEIE_UKEY', default='')

# 前端URL（用于生成二维码）
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ==================== 第三方登录配置 ====================
# Social Auth 配置
SOCIAL_AUTH_URL_NAMESPACE = 'social'
SOCIAL_AUTH_LOGIN_REDIRECT_URL = '/auth/callback/'
SOCIAL_AUTH_LOGIN_ERROR_URL = '/auth/error/'

# 微信登录配置
SOCIAL_AUTH_WEIXIN_KEY = config('WEIXIN_APP_ID', default='')
SOCIAL_AUTH_WEIXIN_SECRET = config('WEIXIN_APP_SECRET', default='')
SOCIAL_AUTH_WEIXIN_SCOPE = 'snsapi_login'  # snsapi_login(PC扫码) 或 snsapi_userinfo(移动网页)

# 支付宝登录配置
SOCIAL_AUTH_ALIPAY_KEY = config('ALIPAY_APP_ID', default='')
SOCIAL_AUTH_ALIPAY_SECRET = config('ALIPAY_PRIVATE_KEY', default='')
SOCIAL_AUTH_ALIPAY_PUBLIC_KEY = config('ALIPAY_PUBLIC_KEY', default='')
SOCIAL_AUTH_ALIPAY_SCOPE = 'auth_user'  # auth_base(静默) 或 auth_user(弹窗)

# ==================== SimpleUI 后台主题配置 ====================
SIMPLEUI_LOGO = None  # 使用默认logo
SIMPLEUI_HOME_INFO = False  # 关闭首页广告
SIMPLEUI_ANALYSIS = False  # 关闭分析
SIMPLEUI_DEFAULT_THEME = 'admin.lte.css'  # 默认主题
SIMPLEUI_STATIC_OFFLINE = True  # 使用离线资源，不使用CDN
SIMPLEUI_CONFIG = {
    'system_keep': True,  # 保留系统菜单
    'menu_display': ['认证和授权', '用户与认证', '店铺管理', '商品管理', '订单管理', '支付管理', '打印管理',
                     '促销管理'],
    'dynamic': True,  # 动态菜单
}

# ==================== 支付网关配置 ====================
# 站点基础URL（用于支付回调默认地址）
SITE_BASE_URL = config('SITE_BASE_URL', default='http://localhost:8000')
# 支付宝网关（沙箱: https://openapi.alipaydev.com/gateway.do）
ALIPAY_GATEWAY = config('ALIPAY_GATEWAY', default='https://openapi.alipay.com/gateway.do')

# ==================== 安全配置 ====================
# HTTPS 强制
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS 配置
SECURE_HSTS_SECONDS = 31536000  # 1年
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# 浏览器安全头
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'same-origin'

# X-Frame-Options（Django默认已是 DENY，显式声明）
X_FRAME_OPTIONS = 'DENY'

# ==================== 字段级加密配置 ====================
import base64
import hashlib

FIELD_ENCRYPTION_KEY = base64.urlsafe_b64encode(
    hashlib.sha256(SECRET_KEY.encode()).digest()
).decode()

# ==================== 日志配置 ====================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
