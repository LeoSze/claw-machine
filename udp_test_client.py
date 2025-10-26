#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UDP Port Test Client
Test if UDP port 8189 is accessible from external network
"""

import socket
import sys
import time
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def udp_test_client(host, port=8189, timeout=5):
    """Send UDP test packet to specified host and port"""

    print(f"UDP Client Test Tool")
    print(f"Target: {host}:{port}")
    print(f"Timeout: {timeout} seconds")
    print("=" * 60)

    # 创建UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)

    try:
        # Prepare test data
        message = f"UDP_TEST_REQUEST:{time.time()}".encode()

        print(f"Sending test packet...")
        print(f"  Data: {message}")

        # Send data
        sock.sendto(message, (host, port))
        print(f"OK Packet sent to {host}:{port}")

        # Wait for response
        print(f"\nWaiting for response (timeout {timeout} seconds)...")

        try:
            data, addr = sock.recvfrom(8192)
            print(f"\nSUCCESS! Received response:")
            print(f"  From: {addr[0]}:{addr[1]}")
            print(f"  Data: {data.decode('utf-8', errors='ignore')}")
            print(f"  Length: {len(data)} bytes")
            print(f"\nConclusion: UDP port {port} is ACCESSIBLE!")
            return True

        except socket.timeout:
            print(f"\nTIMEOUT! No response received")
            print(f"\nPossible reasons:")
            print(f"  1. Firewall blocking UDP port {port}")
            print(f"  2. Router port forwarding not configured correctly")
            print(f"  3. Target server not running or not responding to UDP")
            print(f"  4. ISP may be blocking this UDP port")
            return False

    except Exception as e:
        print(f"\nERROR: {e}")
        return False

    finally:
        sock.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python udp_test_client.py <IP or hostname> [port] [timeout_seconds]")
        print("Example: python udp_test_client.py 183.179.249.63 8189 5")
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8189
    timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 5

    udp_test_client(host, port, timeout)
