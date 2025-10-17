import hashlib
import time

import requests
from django.conf import settings


class BasePrintService:
    """基础打印服务"""

    def __init__(self, printer):
        self.printer = printer

    def print_text(self, content, copies=1):
        """打印文本"""
        raise NotImplementedError

    def print_order(self, order, template=None, copies=1):
        """打印订单"""
        raise NotImplementedError

    def get_printer_status(self):
        """获取打印机状态"""
        raise NotImplementedError


class FeieyunPrintService(BasePrintService):
    """飞鹅云打印服务"""

    def __init__(self, printer):
        super().__init__(printer)
        self.api_url = "http://api.feieyun.cn/Api/Open/"
        self.user = getattr(settings, 'FEIE_USER', '')
        self.ukey = getattr(settings, 'FEIE_UKEY', '')

    def _generate_signature(self, timestamp):
        """生成签名"""
        content = f"{self.user}{self.ukey}{timestamp}"
        return hashlib.sha1(content.encode('utf-8')).hexdigest()

    def print_text(self, content, copies=1):
        """打印文本"""
        timestamp = str(int(time.time()))
        signature = self._generate_signature(timestamp)

        data = {
            'user': self.user,
            'stime': timestamp,
            'sig': signature,
            'apiname': 'Open_printMsg',
            'sn': self.printer.device_no,
            'content': content,
            'times': copies
        }

        try:
            response = requests.post(self.api_url, data=data, timeout=10)
            result = response.json()

            if result.get('ret') == 0:
                return {'success': True, 'task_id': result.get('data'), 'message': '打印任务已发送'}
            else:
                return {'success': False, 'message': result.get('msg', '打印失败')}

        except Exception as e:
            return {'success': False, 'message': f'网络错误: {str(e)}'}

    def print_order(self, order, template=None, copies=1):
        """打印订单小票"""
        content = self._generate_order_content(order, template)
        return self.print_text(content, copies)

    def _generate_order_content(self, order, template):
        """生成订单打印内容"""
        if template:
            # 使用模板生成内容
            return self._render_template(template, order)
        else:
            # 默认格式
            return self._generate_default_order_content(order)

    def _render_template(self, template, order):
        """渲染模板"""
        # 这里实现模板渲染逻辑
        content = template.content_template

        # 替换变量
        content = content.replace('{{order_number}}', order.order_number)
        content = content.replace('{{customer_name}}', order.customer_name)
        content = content.replace('{{customer_phone}}', order.customer_phone)
        content = content.replace('{{total_amount}}', str(order.total_amount))
        content = content.replace('{{created_at}}', order.created_at.strftime('%Y-%m-%d %H:%M'))

        # 处理商品列表
        items_content = ""
        for item in order.items.all():
            items_content += f"{item.product_name} x{item.quantity} {item.total_price}元\n"

        content = content.replace('{{items}}', items_content)

        return content

    def _generate_default_order_content(self, order):
        """生成默认订单内容"""
        content = f"<CB>{order.shop.name}</CB><BR>"
        content += f"<C>订单号: {order.order_number}</C><BR>"
        content += f"时间: {order.created_at.strftime('%Y-%m-%d %H:%M')}<BR>"
        content += "--------------------------------<BR>"

        # 客户信息
        content += f"客户: {order.customer_name}<BR>"
        if order.customer_phone:
            content += f"电话: {order.customer_phone}<BR>"

        if order.table_number:
            content += f"桌号: {order.table_number}<BR>"

        content += "--------------------------------<BR>"

        # 商品列表
        content += "<B>商品明细</B><BR>"
        for item in order.items.all():
            content += f"{item.product_name}<BR>"
            if item.specifications:
                specs = " ".join([f"{k}:{v}" for k, v in item.specifications.items()])
                content += f"  {specs}<BR>"
            content += f"  {item.quantity} x {item.unit_price} = {item.total_price}元<BR>"

        content += "--------------------------------<BR>"

        # 金额汇总
        content += f"小计: {order.subtotal}元<BR>"
        if order.delivery_fee > 0:
            content += f"配送费: {order.delivery_fee}元<BR>"
        if order.discount_amount > 0:
            content += f"优惠: -{order.discount_amount}元<BR>"
        content += f"<B>总计: {order.total_amount}元</B><BR>"

        # 支付信息
        if order.payment_status:
            content += f"支付方式: {order.payment_method}<BR>"
            content += f"支付时间: {order.paid_at.strftime('%H:%M')}<BR>"

        content += "--------------------------------<BR>"
        content += "<C>谢谢惠顾，欢迎再次光临！</C><BR>"

        # 二维码
        if self.printer.print_qrcode:
            qr_url = f"{settings.FRONTEND_URL}/order/{order.order_number}"
            content += f"<QR>{qr_url}</QR><BR>"

        return content

    def get_printer_status(self):
        """获取打印机状态"""
        timestamp = str(int(time.time()))
        signature = self._generate_signature(timestamp)

        data = {
            'user': self.user,
            'stime': timestamp,
            'sig': signature,
            'apiname': 'Open_queryPrinterStatus',
            'sn': self.printer.device_no
        }

        try:
            response = requests.post(self.api_url, data=data, timeout=10)
            result = response.json()

            if result.get('ret') == 0:
                status_data = result.get('data', '')
                # 解析状态数据
                status_map = {
                    '在线': 'online',
                    '正常': 'online',
                    '离线': 'offline',
                    '缺纸': 'paper_out',
                    '开盖': 'cover_open',
                    '过热': 'overheat'
                }

                status = 'unknown'
                for key, value in status_map.items():
                    if key in status_data:
                        status = value
                        break

                return {'success': True, 'status': status, 'message': status_data}
            else:
                return {'success': False, 'message': result.get('msg', '查询失败')}

        except Exception as e:
            return {'success': False, 'message': f'网络错误: {str(e)}'}


class USBPrintService(BasePrintService):
    """USB打印服务"""

    def print_text(self, content, copies=1):
        """USB打印文本"""
        try:
            from escpos.printer import Usb
            from escpos.exceptions import USBNotFoundError

            # 解析连接字符串（格式：vendor_id:product_id:endpoint）
            connection_parts = self.printer.connection_string.split(':')
            if len(connection_parts) < 2:
                return {'success': False, 'message': '无效的连接配置'}

            vendor_id = int(connection_parts[0], 16)
            product_id = int(connection_parts[1], 16)
            endpoint = int(connection_parts[2]) if len(connection_parts) > 2 else 0

            # 连接打印机
            printer = Usb(vendor_id, product_id, endpoint)

            # 打印内容
            for i in range(copies):
                printer.text(content)
                if i < copies - 1:
                    printer.cut()

            printer.cut()

            return {'success': True, 'message': '打印完成'}

        except USBNotFoundError:
            return {'success': False, 'message': '未找到USB打印机'}
        except Exception as e:
            return {'success': False, 'message': f'打印错误: {str(e)}'}


class NetworkPrintService(BasePrintService):
    """网络打印服务"""

    def print_text(self, content, copies=1):
        """网络打印文本"""
        try:
            import socket

            # 连接网络打印机
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((self.printer.ip_address, self.printer.port))

            # 发送打印数据
            for i in range(copies):
                sock.send(content.encode('gbk'))  # 使用GBK编码

            sock.close()

            return {'success': True, 'message': '打印完成'}

        except Exception as e:
            return {'success': False, 'message': f'网络打印错误: {str(e)}'}


class PrintServiceFactory:
    """打印服务工厂"""

    @staticmethod
    def get_service(printer):
        brand = printer.brand

        if brand == 'feie':
            return FeieyunPrintService(printer)
        elif brand == 'usb':
            return USBPrintService(printer)
        elif brand == 'network':
            return NetworkPrintService(printer)
        else:
            raise ValueError(f"不支持的打印机品牌: {brand}")


class PrintContentGenerator:
    """打印内容生成器"""

    @staticmethod
    def generate_order_content(order, template=None):
        """生成订单打印内容"""
        if template:
            # 使用模板
            return PrintContentGenerator._render_template(template, order)
        else:
            # 使用默认格式
            return PrintContentGenerator._generate_default_order_content(order)

    @staticmethod
    def _render_template(template, order):
        """渲染模板"""
        # 实现模板渲染逻辑
        pass

    @staticmethod
    def _generate_default_order_content(order):
        """生成默认订单内容"""
        lines = []

        # 抬头
        lines.append(f"<center><b>{order.shop.name}</b></center>")
        lines.append(f"<center>订单号: {order.order_number}</center>")
        lines.append(f"时间: {order.created_at.strftime('%Y-%m-%d %H:%M')}")
        lines.append("=" * 32)

        # 客户信息
        lines.append(f"客户: {order.customer_name}")
        if order.customer_phone:
            lines.append(f"电话: {order.customer_phone}")

        if order.table_number:
            lines.append(f"桌号: {order.table_number}")

        lines.append("-" * 32)

        # 商品列表
        lines.append("<b>商品明细</b>")
        for item in order.items.all():
            lines.append(f"{item.product_name}")
            if item.specifications:
                specs = " ".join([f"{k}:{v}" for k, v in item.specifications.items()])
                lines.append(f"  {specs}")
            lines.append(f"  {item.quantity} x {item.unit_price} = {item.total_price}元")

        lines.append("-" * 32)

        # 金额汇总
        lines.append(f"小计: {order.subtotal}元")
        if order.delivery_fee > 0:
            lines.append(f"配送费: {order.delivery_fee}元")
        if order.discount_amount > 0:
            lines.append(f"优惠: -{order.discount_amount}元")
        lines.append(f"<b>总计: {order.total_amount}元</b>")

        # 支付信息
        if order.payment_status:
            lines.append(f"支付方式: {order.payment_method}")
            lines.append(f"支付时间: {order.paid_at.strftime('%H:%M')}")

        lines.append("=" * 32)
        lines.append("<center>谢谢惠顾，欢迎再次光临！</center>")

        return "\n".join(lines)

    @staticmethod
    def generate_kitchen_content(order):
        """生成厨房单内容"""
        lines = []

        lines.append(f"<center><b>厨房单</b></center>")
        lines.append(f"订单号: {order.order_number}")
        lines.append(f"时间: {order.created_at.strftime('%H:%M')}")
        if order.table_number:
            lines.append(f"桌号: {order.table_number}")
        lines.append("=" * 32)

        # 商品列表（厨房需要）
        for item in order.items.all():
            lines.append(f"{item.product_name} x{item.quantity}")
            if item.customization:
                lines.append(f"  要求: {item.customization}")

        lines.append("=" * 32)
        lines.append("<center>请尽快制作</center>")

        return "\n".join(lines)