import base64
import time
from decimal import Decimal
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
        self.wechatpay = None

        if self.config and self.config.is_active:
            try:
                # 初始化微信支付V3 SDK
                with open(self.config.cert_path, 'r') as f:
                    private_key = f.read()

                # 构建默认回调URL
                default_notify_url = f"https://yourdomain.com/api/payments/callback/wechat/"

                self.wechatpay = WeChatPay(
                    wechatpay_type=WeChatPayType.NATIVE,
                    mchid=self.config.mch_id,
                    private_key=private_key,
                    cert_serial_no=self._get_cert_serial_no(),
                    appid=self.config.app_id,
                    apiv3_key=self.config.api_key,
                    notify_url=self.config.notify_url or default_notify_url,
                    cert_dir=''
                )
            except Exception as e:
                raise Exception(f"微信支付初始化失败: {str(e)}")

    def _get_cert_serial_no(self):
        """获取证书序列号"""
        # TODO: 从证书文件中提取序列号，这里需要根据实际情况实现
        return self.payment_method.config.get('cert_serial_no', '')

    def create_payment(self, order, request):
        """创建微信支付"""
        if not self.config or not self.config.is_active:
            raise Exception("微信支付未配置或未启用")

        if not self.wechatpay:
            raise Exception("微信支付SDK初始化失败")

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
                description=f"订单{order.order_number}",
                out_trade_no=order.order_number,
                amount={'total': amount, 'currency': 'CNY'},
                payer={}
            )

            # 生成二维码
            code_url = resp.get('code_url')
            if not code_url:
                raise Exception("微信支付返回数据异常")
            
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
        if not openid:
            raise Exception("获取用户OpenID失败")

        try:
            resp = self.wechatpay.pay(
                description=f"订单{order.order_number}",
                out_trade_no=order.order_number,
                amount={'total': amount, 'currency': 'CNY'},
                payer={'openid': openid}
            )

            return {
                'payment_type': 'jsapi',
                'payment_data': resp
            }

        except Exception as e:
            raise Exception(f"微信JSAPI支付创建失败: {str(e)}")

    def _create_miniprogram_payment(self, order, amount, request):
        """创建小程序支付"""
        openid = self._get_user_openid(request)
        if not openid:
            raise Exception("获取用户OpenID失败")

        try:
            resp = self.wechatpay.pay(
                description=f"订单{order.order_number}",
                out_trade_no=order.order_number,
                amount={'total': amount, 'currency': 'CNY'},
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
        # 优先从请求数据中获取
        openid = request.data.get('openid')
        if openid:
            return openid

        # 从用户模型中获取
        if hasattr(request.user, 'wechat_openid') and request.user.wechat_openid:
            return request.user.wechat_openid

        return None

    def handle_callback(self, request):
        """处理微信支付回调"""
        try:
            # 验证签名并解析回调数据
            result = self.wechatpay.callback(
                headers=request.headers,
                body=request.body.decode('utf-8')
            )
            return self._process_payment_result(result)
        except Exception as e:
            raise Exception(f"微信支付回调处理失败: {str(e)}")

    def _process_payment_result(self, result):
        """处理支付结果"""
        from .models import PaymentTransaction

        try:
            # 解析回调数据
            resource = result.get('resource', {})
            out_trade_no = resource.get('out_trade_no')
            transaction_id = resource.get('transaction_id')
            total_fee = int(resource.get('amount', {}).get('total', 0)) / 100
            trade_state = resource.get('trade_state')

            if not out_trade_no:
                return False

            # 查找交易记录
            try:
                transaction = PaymentTransaction.objects.get(out_trade_no=out_trade_no)
            except PaymentTransaction.DoesNotExist:
                return False

            # 更新支付状态
            if trade_state == 'SUCCESS':
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
            else:
                transaction.status = 'failed'
                transaction.payment_data = result
                transaction.save()
                return False

        except Exception as e:
            raise Exception(f"处理支付结果失败: {str(e)}")

    def refund(self, transaction, refund_amount, reason):
        """微信退款"""
        if not self.wechatpay:
            raise Exception("微信支付SDK未初始化")

        try:
            resp = self.wechatpay.refund(
                out_refund_no=f"REFUND{int(time.time())}{transaction.id}",
                amount={
                    'refund': int(refund_amount * 100),
                    'total': int(transaction.amount * 100),
                    'currency': 'CNY'
                },
                transaction_id=transaction.thirdparty_trade_no,
                out_trade_no=transaction.out_trade_no,
                reason=reason or '用户申请退款'
            )

            return resp

        except Exception as e:
            raise Exception(f"微信退款失败: {str(e)}")


class AlipayPaymentService(PaymentService):
    """支付宝支付服务"""

    def __init__(self, payment_method):
        super().__init__(payment_method)
        self.config = getattr(self.shop, 'alipay_config', None)
        self.alipay = None

        if self.config and self.config.is_active:
            try:
                # 初始化支付宝SDK
                from alipay import AliPay

                # 构建默认URL
                default_notify_url = f"https://yourdomain.com/api/payments/callback/alipay/"
                default_return_url = f"https://yourdomain.com/payment/result/"

                # 判断是否为沙箱环境（根据AppID前缀）
                is_sandbox = self.config.app_id.startswith('9021') or self.config.app_id.startswith('20210001')

                self.alipay = AliPay(
                    appid=self.config.app_id,
                    app_notify_url=self.config.notify_url or default_notify_url,
                    app_private_key_string=self.config.app_private_key,
                    alipay_public_key_string=self.config.alipay_public_key,
                    sign_type="RSA2",
                    debug=is_sandbox  # 沙箱环境设为True，正式环境设为False
                )

                # 如果是沙箱环境，设置沙箱网关
                if is_sandbox:
                    self.alipay._gateway = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
                    print(f"✓ 支付宝沙箱模式已启用")
                else:
                    self.alipay._gateway = "https://openapi.alipay.com/gateway.do"
                    print(f"✓ 支付宝正式模式已启用")

            except Exception as e:
                raise Exception(f"支付宝初始化失败: {str(e)}")

    def create_payment(self, order, request):
        """创建支付宝支付"""
        if not self.config or not self.config.is_active:
            raise Exception("支付宝未配置或未启用")

        if not self.alipay:
            raise Exception("支付宝SDK初始化失败")

        # 根据请求类型选择支付方式
        pay_type = self._get_pay_type(request)

        if pay_type == 'wap':
            return self._create_wap_payment(order)
        elif pay_type == 'pc':
            return self._create_pc_payment(order)
        else:
            # 默认使用APP支付
            return self._create_app_payment(order)

    def _get_pay_type(self, request):
        """获取支付类型"""
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()

        if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
            return 'wap'
        else:
            return 'pc'

    def _create_app_payment(self, order):
        """创建APP支付"""
        try:
            # 生成订单信息
            subject = f"订单{order.order_number}"
            total_amount = str(order.total_amount)
            out_trade_no = order.order_number

            # 构建默认URL
            default_return_url = f"https://yourdomain.com/payment/result/"
            default_notify_url = f"https://yourdomain.com/api/payments/callback/alipay/"

            # 调用支付宝接口
            order_string = self.alipay.api_alipay_trade_app_pay(
                out_trade_no=out_trade_no,
                total_amount=total_amount,
                subject=subject,
                return_url=self.config.return_url or default_return_url,
                notify_url=self.config.notify_url or default_notify_url
            )

            return {
                'payment_type': 'app',
                'order_string': order_string,
                'out_trade_no': out_trade_no
            }

        except Exception as e:
            raise Exception(f"支付宝APP支付创建失败: {str(e)}")

    def _create_wap_payment(self, order):
        """创建手机网站支付"""
        try:
            subject = f"订单{order.order_number}"
            total_amount = str(order.total_amount)
            out_trade_no = order.order_number

            # 构建默认URL
            default_return_url = f"https://yourdomain.com/payment/result/"
            default_notify_url = f"https://yourdomain.com/api/payments/callback/alipay/"

            # 生成支付URL
            order_string = self.alipay.api_alipay_trade_wap_pay(
                out_trade_no=out_trade_no,
                total_amount=total_amount,
                subject=subject,
                return_url=self.config.return_url or default_return_url,
                notify_url=self.config.notify_url or default_notify_url
            )

            # 拼接完整的支付URL
            pay_url = f"https://openapi.alipay.com/gateway.do?{order_string}"

            return {
                'payment_type': 'wap',
                'pay_url': pay_url,
                'out_trade_no': out_trade_no
            }

        except Exception as e:
            raise Exception(f"支付宝WAP支付创建失败: {str(e)}")

    def _create_pc_payment(self, order):
        """创建电脑网站支付"""
        try:
            subject = f"订单{order.order_number}"
            total_amount = str(order.total_amount)
            out_trade_no = order.order_number

            # 构建默认URL
            default_return_url = f"https://yourdomain.com/payment/result/"
            default_notify_url = f"https://yourdomain.com/api/payments/callback/alipay/"

            # 生成支付URL
            order_string = self.alipay.api_alipay_trade_page_pay(
                out_trade_no=out_trade_no,
                total_amount=total_amount,
                subject=subject,
                return_url=self.config.return_url or default_return_url,
                notify_url=self.config.notify_url or default_notify_url
            )

            # 拼接完整的支付URL
            pay_url = f"https://openapi.alipay.com/gateway.do?{order_string}"

            return {
                'payment_type': 'pc',
                'pay_url': pay_url,
                'out_trade_no': out_trade_no
            }

        except Exception as e:
            raise Exception(f"支付宝PC支付创建失败: {str(e)}")

    def handle_callback(self, request):
        """处理支付宝支付回调"""
        try:
            # 获取回调数据
            data = request.POST.dict() if request.method == 'POST' else request.GET.dict()

            # 验证签名
            signature = data.pop('sign', '')
            success = self.alipay.verify(data, signature)

            if success:
                # 验证业务状态
                trade_status = data.get('trade_status')
                if trade_status == 'TRADE_SUCCESS' or trade_status == 'TRADE_FINISHED':
                    return self._process_payment_result(data)

            return False

        except Exception as e:
            raise Exception(f"支付宝回调处理失败: {str(e)}")

    def _process_payment_result(self, result):
        """处理支付结果"""
        from .models import PaymentTransaction

        try:
            out_trade_no = result.get('out_trade_no')
            trade_no = result.get('trade_no')
            total_amount = Decimal(result.get('total_amount', '0'))

            if not out_trade_no:
                return False

            # 查找交易记录
            try:
                transaction = PaymentTransaction.objects.get(out_trade_no=out_trade_no)
            except PaymentTransaction.DoesNotExist:
                return False

            # 更新支付状态
            transaction.status = 'paid'
            transaction.thirdparty_trade_no = trade_no
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

        except Exception as e:
            raise Exception(f"处理支付结果失败: {str(e)}")

    def refund(self, transaction, refund_amount, reason):
        """支付宝退款"""
        if not self.alipay:
            raise Exception("支付宝SDK未初始化")

        try:
            # 调用支付宝退款接口
            result = self.alipay.api_alipay_trade_refund(
                out_trade_no=transaction.out_trade_no,
                refund_amount=str(refund_amount),
                refund_reason=reason or '用户申请退款',
                out_request_no=f"REFUND{int(time.time())}{transaction.id}"
            )

            return result

        except Exception as e:
            raise Exception(f"支付宝退款失败: {str(e)}")


class CashPaymentService(PaymentService):
    """现金支付服务"""

    def create_payment(self, order, request):
        """创建现金支付"""
        return {
            'payment_type': 'cash',
            'message': '请向店员支付现金',
            'amount': float(order.total_amount)
        }

    def handle_callback(self, request):
        """现金支付无需回调"""
        return True

    def refund(self, transaction, refund_amount, reason):
        """现金退款"""
        return {'message': '请处理现金退款', 'refund_amount': float(refund_amount)}


class BalancePaymentService(PaymentService):
    """余额支付服务"""

    def create_payment(self, order, request):
        """创建余额支付"""
        user = request.user

        # 检查用户余额
        if not hasattr(user, 'balance') or user.balance < order.total_amount:
            raise Exception("余额不足")

        # 扣除余额
        user.balance -= order.total_amount
        user.save()

        return {
            'payment_type': 'balance',
            'message': '余额支付成功',
            'remaining_balance': float(user.balance)
        }

    def handle_callback(self, request):
        """余额支付无需回调"""
        return True

    def refund(self, transaction, refund_amount, reason):
        """余额退款"""
        user = transaction.order.user
        user.balance += refund_amount
        user.save()

        return {
            'message': '余额退款成功',
            'refund_amount': float(refund_amount),
            'new_balance': float(user.balance)
        }


class PointsPaymentService(PaymentService):
    """积分支付服务"""

    def create_payment(self, order, request):
        """创建积分支付"""
        user = request.user
        points_needed = int(order.total_amount * 100)  # 假设1元=100积分

        # 检查用户积分
        if not hasattr(user, 'points') or user.points < points_needed:
            raise Exception("积分不足")

        # 扣除积分
        user.points -= points_needed
        user.save()

        return {
            'payment_type': 'points',
            'message': '积分支付成功',
            'points_used': points_needed,
            'remaining_points': user.points
        }

    def handle_callback(self, request):
        """积分支付无需回调"""
        return True

    def refund(self, transaction, refund_amount, reason):
        """积分退款"""
        user = transaction.order.user
        points_to_refund = int(refund_amount * 100)
        user.points += points_to_refund
        user.save()

        return {
            'message': '积分退款成功',
            'points_refunded': points_to_refund,
            'new_points': user.points
        }


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