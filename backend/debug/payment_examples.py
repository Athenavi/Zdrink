"""
支付功能使用示例
演示如何使用支付API创建支付和处理回调
"""

# ============================================================
# 示例1: 创建微信扫码支付
# ============================================================

import requests

# API基础URL
BASE_URL = "http://localhost:8000/api"


# 登录获取token
def login():
    response = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": "admin",
        "password": "your_password"
    })
    return response.json()["access"]


# 创建订单
def create_order(token):
    response = requests.post(
        f"{BASE_URL}/orders/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [
                {"product_id": 1, "quantity": 2, "price": 25.00}
            ],
            "order_type": "dine_in",
            "table_number": "A01"
        }
    )
    return response.json()


# 创建微信支付
def create_wechat_payment(token, order_id, payment_method_id):
    response = requests.post(
        f"{BASE_URL}/payments/transactions/create_payment/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "order_id": order_id,
            "payment_method_id": payment_method_id,
            # JSAPI/小程序支付需要openid
            # "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"
        }
    )
    return response.json()


# 主流程
def main():
    # 1. 登录
    token = login()
    print("✓ 登录成功")

    # 2. 创建订单
    order = create_order(token)
    print(f"✓ 订单创建成功: {order['order_number']}")

    # 3. 创建支付（假设支付方式ID为1）
    payment = create_wechat_payment(token, order['id'], 1)
    print(f"✓ 支付创建成功")
    print(f"  交易号: {payment['transaction_no']}")

    # 4. 显示二维码（扫码支付）
    if 'qr_code' in payment['payment_data']:
        print(f"  请使用微信扫描二维码完成支付")
        print(f"  二维码数据: {payment['payment_data']['qr_code'][:50]}...")

    # 5. 查询支付状态
    import time
    time.sleep(5)  # 等待用户支付

    transaction_id = payment['transaction_id']
    response = requests.get(
        f"{BASE_URL}/payments/transactions/{transaction_id}/",
        headers={"Authorization": f"Bearer {token}"}
    )
    transaction = response.json()
    print(f"  支付状态: {transaction['status']}")


# ============================================================
# 示例2: 创建支付宝WAP支付
# ============================================================

def create_alipay_wap_payment(token, order_id, payment_method_id):
    """创建支付宝手机网站支付"""
    response = requests.post(
        f"{BASE_URL}/payments/transactions/create_payment/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "order_id": order_id,
            "payment_method_id": payment_method_id
        }
    )
    return response.json()


def alipay_payment_example():
    token = login()
    order = create_order(token)

    # 假设支付宝支付方式ID为2
    payment = create_alipay_wap_payment(token, order['id'], 2)

    if 'pay_url' in payment['payment_data']:
        print(f"请访问以下URL完成支付:")
        print(payment['payment_data']['pay_url'])


# ============================================================
# 示例3: 申请退款
# ============================================================

def request_refund(token, transaction_id, refund_amount, reason="用户申请退款"):
    """申请退款"""
    response = requests.post(
        f"{BASE_URL}/payments/transactions/{transaction_id}/refund/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "refund_amount": refund_amount,
            "reason": reason
        }
    )
    return response.json()


def refund_example():
    token = login()

    # 退款10元
    result = request_refund(token, 1, 10.00, "商品质量问题")
    print(f"退款结果: {result}")


# ============================================================
# 示例4: 查询支付统计
# ============================================================

def get_payment_statistics(token):
    """获取支付统计"""
    response = requests.get(
        f"{BASE_URL}/payments/statistics/",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json()


def statistics_example():
    token = login()
    stats = get_payment_statistics(token)

    print("今日支付统计:")
    print(f"  总金额: ¥{stats['today_total_amount']}")
    print(f"  交易笔数: {stats['today_payment_count']}")
    print(f"  支付方式分布:")
    for method in stats['payment_methods']:
        print(f"    - {method['payment_method__name']}: "
              f"¥{method['total_amount']} ({method['count']}笔)")


# ============================================================
# 示例5: 前端JavaScript调用示例
# ============================================================

javascript_example = """
// 前端创建支付示例

async function createPayment(orderId, paymentMethodId) {
  try {
    const response = await fetch('/api/payments/transactions/create_payment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        order_id: orderId,
        payment_method_id: paymentMethodId
      })
    });
    
    const payment = await response.json();
    
    // 处理不同的支付类型
    if (payment.payment_data.payment_type === 'native') {
      // 微信扫码支付 - 显示二维码
      document.getElementById('qrcode').src = payment.payment_data.qr_code;
      
      // 轮询检查支付状态
      checkPaymentStatus(payment.transaction_id);
      
    } else if (payment.payment_data.pay_url) {
      // 支付宝WAP/PC支付 - 跳转支付页面
      window.location.href = payment.payment_data.pay_url;
      
    } else if (payment.payment_data.order_string) {
      // 支付宝APP支付 - 调用原生SDK
      AlipaySDK.pay(payment.payment_data.order_string);
    }
    
  } catch (error) {
    console.error('创建支付失败:', error);
  }
}

// 轮询检查支付状态
async function checkPaymentStatus(transactionId) {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/payments/transactions/${transactionId}/`);
      const transaction = await response.json();
      
      if (transaction.status === 'paid') {
        clearInterval(interval);
        alert('支付成功！');
        window.location.href = '/payment/success';
      } else if (transaction.status === 'failed') {
        clearInterval(interval);
        alert('支付失败，请重试');
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);
    }
  }, 3000); // 每3秒检查一次
  
  // 5分钟后停止轮询
  setTimeout(() => clearInterval(interval), 300000);
}

// 使用示例
createPayment(123, 1); // 创建微信支付
"""

# ============================================================
# 运行示例
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("支付功能使用示例")
    print("=" * 60)

    print("\n请选择要运行的示例:")
    print("1. 微信扫码支付完整流程")
    print("2. 支付宝WAP支付")
    print("3. 退款示例")
    print("4. 支付统计")
    print("5. 查看JavaScript示例代码")

    choice = input("\n请输入选项 (1-5): ").strip()

    try:
        if choice == '1':
            main()
        elif choice == '2':
            alipay_payment_example()
        elif choice == '3':
            refund_example()
        elif choice == '4':
            statistics_example()
        elif choice == '5':
            print("\nJavaScript示例代码:\n")
            print(javascript_example)
        else:
            print("无效的选项")
    except Exception as e:
        print(f"错误: {str(e)}")
        import traceback

        traceback.print_exc()
