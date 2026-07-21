"""
验证码服务
负责验证码的生成、发送（阿里云SMS/腾讯云SMS/SMTP邮件）和校验
"""
import hashlib
import json
import logging
import random
import string
from datetime import timedelta

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import VerifyCode, VerifyConfig

logger = logging.getLogger(__name__)


def _get_config():
    """获取验证码配置，无配置时返回默认值"""
    try:
        config = VerifyConfig.objects.filter(is_active=True).first()
        if config:
            return config
    except Exception:
        pass
    return None


def generate_code(length: int = 6) -> str:
    """生成纯数字验证码"""
    return ''.join(random.choices(string.digits, k=length))


# ── 短信发送 ──


def send_code_via_sms(phone: str, code: str) -> bool:
    """
    根据 VerifyConfig 中配置的短信服务商发送
    支持：控制台日志、阿里云短信、腾讯云短信
    """
    config = _get_config()
    if not config or config.sms_provider == 'console':
        return _send_sms_console(phone, code)

    if config.sms_provider == 'aliyun':
        return _send_sms_aliyun(phone, code, config)
    elif config.sms_provider == 'tencent':
        return _send_sms_tencent(phone, code, config)

    return _send_sms_console(phone, code)


def _send_sms_console(phone: str, code: str) -> bool:
    """开发环境：打印到日志"""
    logger.info('=' * 50)
    logger.info(f'【短信验证码】手机号: {phone}')
    logger.info(f'【短信验证码】验证码: {code}')
    logger.info('=' * 50)
    return True


def _send_sms_aliyun(phone: str, code: str, config) -> bool:
    """阿里云短信发送"""
    try:
        # 使用 DMApi（轻量级 HTTP 调用，无需 SDK）
        import hmac
        import base64
        from urllib.parse import urlencode, quote
        from datetime import datetime

        params = {
            'Action': 'SendSms',
            'AccessKeyId': config.aliyun_access_key,
            'Format': 'JSON',
            'RegionId': 'cn-hangzhou',
            'SignatureMethod': 'HMAC-SHA1',
            'SignatureNonce': str(random.randint(1, 10 ** 10)),
            'SignatureVersion': '1.0',
            'Timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'Version': '2017-05-25',
            'PhoneNumbers': phone,
            'SignName': config.aliyun_sign_name,
            'TemplateCode': config.aliyun_template_code,
            'TemplateParam': json.dumps({'code': code}, ensure_ascii=False),
        }

        # 计算签名
        sorted_keys = sorted(params.keys())
        query = '&'.join(
            f'{quote(k, safe="")}={quote(str(params[k]), safe="")}'
            for k in sorted_keys
        )
        string_to_sign = f'GET&%2F&{quote(query, safe="")}'
        key = f'{config.aliyun_secret_key}&'
        signature = base64.b64encode(
            hmac.new(key.encode(), string_to_sign.encode(), hashlib.sha1).digest()
        ).decode()
        params['Signature'] = signature

        resp = requests.get(
            'https://dysmsapi.aliyuncs.com',
            params=params,
            timeout=10
        )
        result = resp.json()
        if result.get('Code') == 'OK':
            logger.info(f'阿里云短信发送成功: {phone}')
            return True
        logger.error(f'阿里云短信失败: {result}')
        return False
    except ImportError:
        pass
    except Exception as e:
        logger.error(f'阿里云短信发送异常: {e}')
        return _send_sms_console(phone, code)


def _send_sms_tencent(phone: str, code: str, config) -> bool:
    """腾讯云短信发送"""
    try:
        import hashlib
        import hmac
        import base64

        timestamp = int(timezone.now().timestamp())
        # 构建请求参数
        payload = {
            'SecretId': config.tencent_secret_id,
            'Timestamp': timestamp,
            'Nonce': random.randint(1, 10 ** 8),
            'SignatureMethod': 'HmacSHA256',
            'Action': 'SendSms',
            'Version': '2021-01-11',
            'Region': 'ap-guangzhou',
            'PhoneNumberSet': [phone],
            'SmsSdkAppId': config.tencent_sdk_app_id,
            'SignName': config.tencent_sign_name,
            'TemplateId': config.tencent_template_code,
            'TemplateParamSet': [code],
        }

        # 简化：使用腾讯云 SMS 的 HTTP API
        from urllib.parse import urlencode, quote

        params = {k: v for k, v in payload.items() if v is not None}
        sorted_keys = sorted(params.keys())
        query = '&'.join(
            f'{quote(k, safe="")}={quote(str(params[k]), safe="")}'
            for k in sorted_keys
        )
        string_to_sign = f'GETsms.tencentcloudapi.com/?{query}'

        secret_key = config.tencent_secret_key.encode()
        signature = base64.b64encode(
            hmac.new(secret_key, string_to_sign.encode(), hashlib.sha256).digest()
        ).decode()
        params['Signature'] = signature

        resp = requests.get(
            'https://sms.tencentcloudapi.com',
            params=params,
            timeout=10
        )
        result = resp.json()
        if result.get('Response', {}).get('SendStatusSet'):
            logger.info(f'腾讯云短信发送成功: {phone}')
            return True
        logger.error(f'腾讯云短信失败: {result}')
        return False
    except Exception as e:
        logger.error(f'腾讯云短信发送异常: {e}')
        return _send_sms_console(phone, code)


# ── 邮件发送 ──


def send_code_via_email(email: str, code: str) -> bool:
    """
    根据 VerifyConfig 中配置的 SMTP 参数发送邮件验证码
    """
    config = _get_config()
    if config and config.email_host:
        try:
            # 临时覆盖 Django 邮件配置
            from django.core import mail
            old_host = mail.get_connection().host

            send_mail(
                subject='验证码',
                message=f'您的验证码是：{code}，{config.code_expire_seconds}秒内有效。',
                from_email=config.email_from or settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                connection=mail.get_connection(
                    host=config.email_host,
                    port=config.email_port,
                    username=config.email_host_user,
                    password=config.email_host_password,
                    use_tls=config.email_use_tls,
                    use_ssl=config.email_use_ssl,
                )
            )
            logger.info(f'邮件发送成功: {email}')
            return True
        except Exception as e:
            logger.error(f'邮件发送失败: {e}')
            return _send_email_console(email, code)
    else:
        return _send_email_console(email, code)


def _send_email_console(email: str, code: str) -> bool:
    """开发环境：打印到日志"""
    logger.info('=' * 50)
    logger.info(f'【邮件验证码】邮箱: {email}')
    logger.info(f'【邮件验证码】验证码: {code}')
    logger.info('=' * 50)
    return True


# ── 验证码生命周期管理 ──


def create_and_send_code(phone: str = '', email: str = '', purpose: str = 'login') -> str:
    """
    生成并发送验证码
    返回验证码文本（开发阶段前端可用，生产需关闭）
    """
    config = _get_config()

    if config:
        code_length = config.code_length
        expire_seconds = config.code_expire_seconds
    else:
        code_length = 6
        expire_seconds = 300

    code = generate_code(code_length)
    expires_at = timezone.now() + timedelta(seconds=expire_seconds)

    # 存储到数据库
    VerifyCode.objects.create(
        phone=phone,
        email=email,
        code=code,
        purpose=purpose,
        expires_at=expires_at,
    )

    # 发送
    if phone:
        send_code_via_sms(phone, code)
    elif email:
        send_code_via_email(email, code)

    return code


def verify_code(phone: str = '', email: str = '', code: str = '', purpose: str = 'login') -> bool:
    """
    校验验证码
    验证后标记为已使用（防止重复使用）
    """

    if phone:
        qs = VerifyCode.objects.filter(phone=phone, code=code, purpose=purpose, is_used=False)
    elif email:
        qs = VerifyCode.objects.filter(email=email, code=code, purpose=purpose, is_used=False)
    else:
        return False

    record = qs.order_by('-created_at').first()
    if not record:
        return False

    if record.is_expired:
        return False

    # 标记已使用
    record.is_used = True
    record.save(update_fields=['is_used'])

    return True


def get_login_mode() -> dict:
    """
    获取验证码登录模式的配置
    返回: {'enabled': bool, 'phone': bool, 'email': bool, 'mode': str}
    """
    config = _get_config()
    if not config:
        return {'enabled': False, 'phone': False, 'email': False, 'mode': 'any'}

    return {
        'enabled': config.is_active,
        'phone': config.enable_phone_login,
        'email': config.enable_email_login,
        'mode': config.login_mode,
    }
