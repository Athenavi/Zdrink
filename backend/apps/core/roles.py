# 角色权限配置
ROLE_PERMISSIONS = {
    'owner': {
        'name': '店主',
        'permissions': [
            'shop_manage',           # 店铺管理
            'staff_manage',          # 员工管理
            'product_manage',        # 商品管理
            'category_manage',       # 分类管理
            'order_manage',          # 订单管理
            'order_process',         # 订单处理
            'inventory_manage',      # 库存管理
            'payment_manage',        # 支付管理
            'customer_manage',       # 客户管理
            'report_view',           # 报表查看
            'setting_manage',        # 设置管理
        ]
    },
    'manager': {
        'name': '店长',
        'permissions': [
            'product_manage',        # 商品管理
            'category_manage',       # 分类管理
            'order_manage',          # 订单管理
            'order_process',         # 订单处理
            'inventory_manage',      # 库存管理
            'customer_manage',       # 客户管理
            'report_view',           # 报表查看
        ]
    },
    'staff': {
        'name': '员工',
        'permissions': [
            'order_process',         # 订单处理
            'inventory_manage',      # 库存管理（有限）
        ]
    },
    'cashier': {
        'name': '收银员',
        'permissions': [
            'order_process',         # 订单处理
        ]
    }
}

def get_role_permissions(role):
    """获取角色权限"""
    return ROLE_PERMISSIONS.get(role, {}).get('permissions', [])

def create_staff_permissions(role):
    """根据角色创建权限配置"""
    permissions = get_role_permissions(role)
    return {perm: True for perm in permissions}