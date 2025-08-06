import numpy as np
from Crypto.Cipher import AES, Blowfish
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import cv2
from base64 import b64encode, b64decode

# 1. AES Encryption / Decryption
def aes_encrypt(data_bytes: bytes, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(data_bytes, AES.block_size))
    return cipher.iv + ct_bytes

def aes_decrypt(encrypted_bytes: bytes, key: bytes) -> bytes:
    iv = encrypted_bytes[:AES.block_size]
    ct = encrypted_bytes[AES.block_size:]
    cipher = AES.new(key, AES.MODE_CBC, iv)
    pt = unpad(cipher.decrypt(ct), AES.block_size)
    return pt

# 2. Blowfish Encryption / Decryption
def blowfish_encrypt(data_bytes: bytes, key: bytes) -> bytes:
    cipher = Blowfish.new(key, Blowfish.MODE_CBC)
    ct_bytes = cipher.encrypt(pad(data_bytes, Blowfish.block_size))
    return cipher.iv + ct_bytes

def blowfish_decrypt(encrypted_bytes: bytes, key: bytes) -> bytes:
    iv = encrypted_bytes[:Blowfish.block_size]
    ct = encrypted_bytes[Blowfish.block_size:]
    cipher = Blowfish.new(key, Blowfish.MODE_CBC, iv)
    pt = unpad(cipher.decrypt(ct), Blowfish.block_size)
    return pt

# 3. LSB Steganography (for simplicity, just embed a key message into image pixels)
def lsb_encrypt(image_bytes: bytes, message: str) -> bytes:
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    message_bits = ''.join([format(ord(c), '08b') for c in message]) + '1111111111111110'  # EOF pattern
    flat_img = img.flatten()
    for i in range(len(message_bits)):
        flat_img[i] = (flat_img[i] & ~1) | int(message_bits[i])
    img = flat_img.reshape(img.shape)
    _, encoded_img = cv2.imencode('.png', img)
    return encoded_img.tobytes()

def lsb_decrypt(image_bytes: bytes) -> str:
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    flat_img = img.flatten()
    bits = []
    for i in range(len(flat_img)):
        bits.append(str(flat_img[i] & 1))
        if len(bits) >= 16 and bits[-16:] == list('1111111111111110'):
            break
    bits = bits[:-16]
    message = ''.join(chr(int(''.join(bits[i:i+8]), 2)) for i in range(0, len(bits), 8))
    return message

# 4. Chaos-based Encryption (simplified example using logistic map)
def logistic_map_encrypt(data_bytes: bytes, key: float = 3.99) -> bytes:
    # Generate chaotic sequence
    x = 0.5
    seq = []
    for _ in range(len(data_bytes)):
        x = key * x * (1 - x)
        seq.append(int(x * 255) & 0xFF)
    encrypted = bytes([b ^ s for b, s in zip(data_bytes, seq)])
    return encrypted

def logistic_map_decrypt(encrypted_bytes: bytes, key: float = 3.99) -> bytes:
    return logistic_map_encrypt(encrypted_bytes, key)  # symmetric

# 5. Hybrid Method: AES + Logistic map XOR
def hybrid_encrypt(data_bytes: bytes, aes_key: bytes, chaos_key: float = 3.99) -> bytes:
    aes_encrypted = aes_encrypt(data_bytes, aes_key)
    hybrid_encrypted = logistic_map_encrypt(aes_encrypted, chaos_key)
    return hybrid_encrypted

def hybrid_decrypt(hybrid_encrypted: bytes, aes_key: bytes, chaos_key: float = 3.99) -> bytes:
    aes_encrypted = logistic_map_decrypt(hybrid_encrypted, chaos_key)
    decrypted = aes_decrypt(aes_encrypted, aes_key)
    return decrypted
