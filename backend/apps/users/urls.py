from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    MembershipLevelConfigViewSet, PointsRuleViewSet, PointsLogView,
    MemberRechargeViewSet, user_membership_info, consume_points, signin_earn_points
)

router = DefaultRouter()
router.register(r'membership-levels', MembershipLevelConfigViewSet, basename='membership-level')
router.register(r'points-rules', PointsRuleViewSet, basename='points-rule')
router.register(r'recharges', MemberRechargeViewSet, basename='member-recharge')

urlpatterns = [
    path('', include(router.urls)),
    path('profile/membership/', user_membership_info, name='user-membership'),
    path('points/logs/', PointsLogView.as_view(), name='points-logs'),
    path('points/consume/', consume_points, name='consume-points'),
    path('points/signin/', signin_earn_points, name='signin-points'),
]