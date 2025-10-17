from apps.users.api import (
    RegisterView,
    LoginView,
    LogoutView,
    UserProfileView,
    UpdateProfileView,
    ChangePasswordView,
    get_current_user
)
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API文档
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # 认证相关
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', get_current_user, name='current_user'),
    path('api/auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/auth/profile/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change_password'),

    # 公共API（不需要租户上下文）
    path('api/shops/', include('apps.shops.urls')),

    # 租户特定API（这些将在租户上下文中运行）
    path('api/', include('apps.core.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/printing/', include('apps.printing.urls')),
    path('api/pos/', include('apps.pos.urls')),

    # 优惠券API
    path('api/promotions/', include('apps.promotions.urls')),
]

# 开发环境下的静态文件服务
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
