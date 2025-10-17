import base64
import time
from io import BytesIO

import qrcode
from django.utils import timezone
from wechatpayv3 import WeChatPay, WeChatPayType


class PaymentService:
    """支付服务基类"""

    def __init__(self, payment_method):
        self.payment_method = payment_method
        self.shop = payment_method.shop

    def create_payment(self, order, request):
        """创建支付"""
        raise NotImplementedError

    def handle_callback(self, request):
        """处理支付回调"""
        raise NotImplementedError

    def refund(self, transaction, refund_amount, reason):
        """退款"""
        raise NotImplementedError


class WechatPaymentService(PaymentService):
    """微信支付服务"""

    def __init__(self, payment_method):
        super().__init__(payment_method)
        self.config = getattr(self.shop, 'wechat_pay_config', None)

        if self.config:
            self.wechatpay = WeChatPay(
                wechatpay_type=WeChatPayType.NATIVE,
                mchid=self.config.mch_id,
                private_key=self.config.api_key,
                cert_serial_no='',  # 需要从证书获取
                appid=self.config.app_id,
                apiv3_key=self.config.api_key,
                notify_url=self.config.notify_url,
                cert_dir=''
            )

    def create_payment(self, order, request):
        """创建微信支付"""
        if not self.config:
            raise Exception("微信支付未配置")

        # 构建支付请求
        amount = int(order.total_amount * 100)  # 转换为分

        # 根据支付场景选择支付类型
        pay_type = self._get_pay_type(request)

        if pay_type == WeChatPayType.JSAPI:
            # JSAPI支付（微信公众号）
            return self._create_jsapi_payment(order, amount, request)
        elif pay_type == WeChatPayType.MINIPROG:
            # 小程序支付
            return self._create_miniprogram_payment(order, amount, request)
        else:
            # 原生支付（扫码支付）
            return self._create_native_payment(order, amount)

    def _get_pay_type(self, request):
        """获取支付类型"""
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()

        if 'micromessenger' in user_agent:
            # 微信内打开
            if 'miniprogram' in user_agent:
                return WeChatPayType.MINIPROG
            else:
                return WeChatPayType.JSAPI
        else:
            return WeChatPayType.NATIVE

    def _create_native_payment(self, order, amount):
        """创建原生支付（扫码支付）"""
        try:
            resp = self.wechatpay.pay(
                description=order.order_number,
                out_trade_no=order.order_number,
                amount={'total': amount},
                payer={'openid': ''}  # 扫码支付不需要openid
            )

            # 生成二维码
            code_url = resp.get('code_url')
            qr_img = qrcode.make(code_url)
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

            return {
                'payment_type': 'native',
                'code_url': code_url,
                'qr_code': f"data:image/png;base64,{qr_code_base64}",
                'payment_data': resp
            }

        except Exception as e:
            raise Exception(f"微信支付创建失败: {str(e)}")

    def _create_jsapi_payment(self, order, amount, request):
        """创建JSAPI支付"""
        # 需要获取用户openid
        openid = self._get_user_openid(request)

        try:
            resp = self.wechatpay.pay(
                description=order.order_number,
                out_trade_no=order.order_number,
                amount={'total': amount},
                payer={'openid': openid}
            )

            return {
                'payment_type': 'jsapi',
                'payment_data': resp
            }

        except Exception as e:
            raise Exception(f"微信支付创建失败: {str(e)}")

    def _create_miniprogram_payment(self, order, amount, request):
        """创建小程序支付"""
        openid = self._get_user_openid(request)

        try:
            resp = self.wechatpay.pay(
                description=order.order_number,
                out_trade_no=order.order_number,
                amount={'total': amount},
                payer={'openid': openid}
            )

            return {
                'payment_type': 'miniprogram',
                'payment_data': resp
            }

        except Exception as e:
            raise Exception(f"微信小程序支付创建失败: {str(e)}")

    def _get_user_openid(self, request):
        """获取用户openid"""
        # 这里需要实现获取用户openid的逻辑
        # 可以通过微信授权或前端传递
        return request.data.get('openid') or request.user.wechat_openid

    def handle_callback(self, request):
        """处理微信支付回调"""
        try:
            result = self.wechatpay.callback(request.headers, request.body.decode('utf-8'))
            return self._process_payment_result(result)
        except Exception as e:
            raise Exception(f"微信支付回调处理失败: {str(e)}")

    def _process_payment_result(self, result):
        """处理支付结果"""
        out_trade_no = result.get('out_trade_no')
        transaction_id = result.get('transaction_id')
        total_fee = int(result.get('amount', {}).get('total', 0)) / 100

        # 更新支付状态
        from .models import PaymentTransaction
        try:
            transaction = PaymentTransaction.objects.get(out_trade_no=out_trade_no)
            transaction.status = 'paid'
            transaction.thirdparty_trade_no = transaction_id
            transaction.paid_at = timezone.now()
            transaction.payment_data = result
            transaction.save()

            # 更新订单状态
            order = transaction.order
            order.payment_status = True
            order.paid_at = timezone.now()
            order.status = 'paid'
            order.save()

            return True

        except PaymentTransaction.DoesNotExist:
            return False

    def refund(self, transaction, refund_amount, reason):
        """微信退款"""
        try:
            resp = self.wechatpay.refund(
                out_refund_no=f"REFUND{int(time.time())}",
                amount={'refund': int(refund_amount * 100), 'total': int(transaction.amount * 100)},
                transaction_id=transaction.thirdparty_trade_no,
                out_trade_no=transaction.out_trade_no,
                reason=reason
            )

            return resp

        except Exception as e:
            raise Exception(f"微信退款失败: {str(e)}")


class AlipayPaymentService(PaymentService):
    """支付宝支付服务"""

    def create_payment(self, order, request):
        """创建支付宝支付"""
        # 实现支付宝支付逻辑
        pass

    def handle_callback(self, request):
        """处理支付宝支付回调"""
        pass

    def refund(self, transaction, refund_amount, reason):
        """支付宝退款"""
        pass


class CashPaymentService(PaymentService):
    """现金支付服务"""

    def create_payment(self, order, request):
        """创建现金支付"""
        return {
            'payment_type': 'cash',
            'message': '请向店员支付现金',
            'amount': order.total_amount
        }

    def handle_callback(self, request):
        """现金支付无需回调"""
        return True

    def refund(self, transaction, refund_amount, reason):
        """现金退款"""
        return {'message': '请处理现金退款'}


class PaymentServiceFactory:
    """支付服务工厂"""

    @staticmethod
    def get_service(payment_method):
        code = payment_method.code

        if code == 'wechat':
            return WechatPaymentService(payment_method)
        elif code == 'alipay':
            return AlipayPaymentService(payment_method)
        elif code == 'cash':
            return CashPaymentService(payment_method)
        elif code == 'balance':
            return BalancePaymentService(payment_method)
        elif code == 'points':
            return PointsPaymentService(payment_method)
        else:
            raise ValueError(f"不支持的支付方式: {code}")