#!/usr/bin/env python3
"""
UDP端口测试服务器
用于验证8189端口是否可以从外网访问
"""

import socket
import datetime

def udp_test_server(port=8189):
    """创建一个UDP测试服务器，响应所有收到的数据包"""

    # 创建UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # 绑定到所有接口的指定端口
    sock.bind(('0.0.0.0', port))

    print(f"UDP测试服务器启动在端口 {port}")
    print(f"监听地址: 0.0.0.0:{port}")
    print(f"开始时间: {datetime.datetime.now()}")
    print("=" * 60)
    print("等待UDP数据包...")
    print("提示: 使用Ctrl+C停止服务器")
    print("=" * 60)

    try:
        while True:
            # 接收数据（最大缓冲区8192字节）
            data, addr = sock.recvfrom(8192)

            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n[{timestamp}] 收到数据包:")
            print(f"  来源: {addr[0]}:{addr[1]}")
            print(f"  数据长度: {len(data)} 字节")
            print(f"  数据内容: {data[:100]}")  # 只显示前100字节

            # 发送响应
            response = f"UDP_TEST_OK:{timestamp}:{addr[0]}:{addr[1]}".encode()
            sock.sendto(response, addr)
            print(f"  已发送响应: {len(response)} 字节")

    except KeyboardInterrupt:
        print("\n\n服务器停止")
    finally:
        sock.close()

if __name__ == "__main__":
    udp_test_server(8189)
