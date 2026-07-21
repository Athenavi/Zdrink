"""
人机验证服务
支持：极验 GEETEST v4、腾讯云验证码、阿里云验证码、顶象、网易易盾
"""
import hashlib
import json
import logging

import requests

from .models import CaptchaConfig

logger = logging.getLogger(__name__)


def _get_config():
    try:
        obj = CaptchaConfig.objects.filter(is_active=True).first()
        if obj and obj.provider != 'none':
            return obj
    except Exception:
        pass
    return None


def get_captcha_config() -> dict:
    """
    前端初始化人机验证时需要的信息
    返回：{ provider, captcha_id / app_id 等 }
    """
    obj = _get_config()
    if not obj:
        return {'provider': 'none', 'active': False}

    result = {'provider': obj.provider, 'active': True}

    if obj.provider == 'geetest':
        result['captcha_id'] = obj.geetest_captcha_id
    elif obj.provider == 'tencent':
        result['app_id'] = obj.tencent_app_id
    elif obj.provider == 'aliyun':
        result['app_key'] = obj.aliyun_app_key
    elif obj.provider == 'dingxiang':
        result['app_id'] = obj.dingxiang_app_id
    elif obj.provider == 'netease':
        result['captcha_id'] = obj.netease_captcha_id

    return result


def verify_captcha_token(provider: str, token_data: dict) -> bool:
    """
    统一验证人机验证 token
    token_data 包含不同平台所需的校验参数
    """
    obj = _get_config()
    if not obj or obj.provider != provider:
        return False

    if provider == 'geetest':
        return _verify_geetest(obj, token_data)
    elif provider == 'tencent':
        return _verify_tencent(obj, token_data)
    elif provider == 'aliyun':
        return _verify_aliyun(obj, token_data)
    elif provider == 'dingxiang':
        return _verify_dingxiang(obj, token_data)
    elif provider == 'netease':
        return _verify_netease(obj, token_data)

    return False


def _verify_geetest(obj, data: dict) -> bool:
    """极验 GEETEST v4 二次校验"""
    try:
        lot_number = data.get('lot_number', '')
        captcha_output = data.get('captcha_output', '')
        pass_token = data.get('pass_token', '')
        gen_time = data.get('gen_time', '')

        # 生成签名
        sign_token = hashlib.md5(
            f"{lot_number}{obj.geetest_captcha_key}".encode()
        ).hexdigest()

        resp = requests.post(
            'https://gcaptcha4.geetest.com/validate',
            data={
                'captcha_id': obj.geetest_captcha_id,
                'lot_number': lot_number,
                'captcha_output': captcha_output,
                'pass_token': pass_token,
                'gen_time': gen_time,
                'sign_token': sign_token,
            },
            timeout=5
        )
        result = resp.json()
        return result.get('result') == 'success'
    except Exception as e:
        logger.error(f'极验验证失败: {e}')
        return False


def _verify_tencent(obj, data: dict) -> bool:
    """腾讯云验证码校验"""
    try:
        from urllib.parse import urlencode
        ticket = data.get('ticket', '')
        randstr = data.get('randstr', '')
        user_ip = data.get('user_ip', '')

        params = {
            'appId': obj.tencent_app_id,
            'secretKey': obj.tencent_secret_key,
            'ticket': ticket,
            'randstr': randstr,
            'userip': user_ip,
        }

        resp = requests.get(
            'https://ssl.captcha.qcloud.com/ticket/verify',
            params=params,
            timeout=5
        )
        result = resp.json()
        return result.get('response') == '1'
    except Exception as e:
        logger.error(f'腾讯云验证码验证失败: {e}')
        return False


def _verify_aliyun(obj, data: dict) -> bool:
    """阿里云验证码校验"""
    try:
        # 阿里云使用 Data Center 方式，需要调用 VerifyCaptcha API
        # 使用 AccessKey 签名，这里简化处理
        session_id = data.get('session_id', '')
        sig = data.get('sig', '')
        token = data.get('token', '')
        scene = data.get('scene', '')

        from aliyun_python_sdk_core.client import AcsClient
        from aliyun_python_sdk_captcha.request.v20230305 import VerifyCaptchaRequest

        client = AcsClient(obj.aliyun_app_key, obj.aliyun_secret_key, 'cn-hangzhou')
        request = VerifyCaptchaRequest.VerifyCaptchaRequest()
        request.set_CaptchaVerifyParam(json.dumps({
            'captchaVerifyParam': json.dumps({
                'sessionId': session_id,
                'sig': sig,
                'token': token,
                'scene': scene,
            })
        }))

        response = client.do_action_with_exception(request)
        result = json.loads(response)
        return result.get('data', {}).get('verifyResult') is True
    except ImportError:
        logger.warning('阿里云验证码需要安装 aliyun-python-sdk-core 和 aliyun-python-sdk-captcha')
        return False
    except Exception as e:
        logger.error(f'阿里云验证码验证失败: {e}')
        return False


def _verify_dingxiang(obj, data: dict) -> bool:
    """顶象验证码校验"""
    try:
        token = data.get('token', '')
        resp = requests.post(
            'https://cap.dingxiang-inc.com/api/tokenVerify',
            data={
                'appId': obj.dingxiang_app_id,
                'appSecret': obj.dingxiang_app_secret,
                'token': token,
            },
            timeout=5
        )
        result = resp.json()
        return result.get('success') is True
    except Exception as e:
        logger.error(f'顶象验证码验证失败: {e}')
        return False


def _verify_netease(obj, data: dict) -> bool:
    """网易易盾验证码校验"""
    try:
        validate = data.get('validate', '')
        resp = requests.post(
            'https://c.dun.163yun.com/api/v3/verify',
            data={
                'captchaId': obj.netease_captcha_id,
                'secretKey': obj.netease_secret_key,
                'validate': validate,
                'user': data.get('user', ''),
            },
            timeout=5
        )
        result = resp.json()
        return result.get('result') is True
    except Exception as e:
        logger.error(f'网易易盾验证码验证失败: {e}')
        return False
