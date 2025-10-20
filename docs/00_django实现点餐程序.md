# Django项目初始化步骤


## 第一步：项目环境准备

### 1. 创建项目目录结构
```bash
# 创建项目根目录
mkdir zdrink
cd zdrink

# 创建目录结构
mkdir -p backend frontend docs
```

### 2. 设置Python虚拟环境
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 3. 安装基础依赖
```bash
# 在backend目录中创建requirements.txt
cd backend

# 创建requirements.txt文件，包含以下内容：
cat > requirements.txt << EOF
Django==4.2.0
djangorestframework==3.14.0
django-cors-headers==4.0.0
Pillow==9.5.0
python-decouple==3.8
django-extensions==3.2.3
celery==5.3.0
redis==4.5.5
drf-yasg==1.21.4
django-filter==23.1
EOF

# 安装依赖
pip install -r requirements.txt
```

## 第二步：创建Django项目和应用

### 1. 创建Django项目
```bash
# 在backend目录中创建项目
django-admin startproject zdrink_core .

# 创建应用模块
mkdir apps
cd apps

# 创建核心应用
django-admin startapp core
django-admin startapp users
django-admin startapp shops
django-admin startapp products
django-admin startapp orders
django-admin startapp payments
```

### 2. 配置项目设置
编辑 `zdrink_core/settings.py`：

## 第三步：创建基础模型

### 1. 用户模型 (apps/users/models.py)
```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('super_admin', '超级管理员'),
        ('shop_owner', '店铺所有者'),
        ('shop_staff', '店铺员工'),
        ('customer', '顾客'),
    )
    
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='customer')
    phone = models.CharField(max_length=15, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
```

### 2. 修改AUTH_USER_MODEL
在 `settings.py` 中添加：
```python
AUTH_USER_MODEL = 'users.User'
```

## 第四步：初始迁移和超级用户

```bash
# 创建迁移文件
python manage.py makemigrations

# 执行迁移
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser
```


## 下一步计划
1. 设置REST API框架
2. 创建用户认证系统
3. 实现多租户架构
4. 构建店铺管理基础模块