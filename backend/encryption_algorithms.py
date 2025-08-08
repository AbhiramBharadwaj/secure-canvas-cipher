import logging
import numpy as np
from Crypto.Cipher import AES, Blowfish
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import cv2
from base64 import b64encode, b64decode

# ─── Configure Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 1. AES Encryption / Decryption
def aes_encrypt(data_bytes: bytes, key: bytes) -> bytes:
    logging.debug(f"AES encrypt: data length={len(data_bytes)}, key length={len(key)}")
    cipher = AES.new(key, AES.MODE_CBC)
    iv = cipher.iv
    logging.debug(f"AES encrypt: generated IV={iv.hex()}")
    padded = pad(data_bytes, AES.block_size)
    logging.debug(f"AES encrypt: padded length={len(padded)}")
    ct_bytes = cipher.encrypt(padded)
    logging.debug(f"AES encrypt: ciphertext length={len(ct_bytes)}")
    result = iv + ct_bytes
    logging.debug(f"AES encrypt: output length={len(result)}, prefix (IV+first block)={result[:32].hex()}")
    return result

def aes_decrypt(encrypted_bytes: bytes, key: bytes) -> bytes:
    logging.debug(f"AES decrypt: total input length={len(encrypted_bytes)}, key length={len(key)}")
    iv = encrypted_bytes[:AES.block_size]
    ct = encrypted_bytes[AES.block_size:]
    logging.debug(f"AES decrypt: IV={iv.hex()}, ciphertext length={len(ct)}")
    cipher = AES.new(key, AES.MODE_CBC, iv)
    pt_padded = cipher.decrypt(ct)
    logging.debug(f"AES decrypt: decrypted padded length={len(pt_padded)}")
    pt = unpad(pt_padded, AES.block_size)
    logging.debug(f"AES decrypt: unpadded plaintext length={len(pt)}")
    return pt

# 2. Blowfish Encryption / Decryption
def blowfish_encrypt(data_bytes: bytes, key: bytes) -> bytes:
    logging.debug(f"Blowfish encrypt: data length={len(data_bytes)}, key length={len(key)}")
    cipher = Blowfish.new(key, Blowfish.MODE_CBC)
    iv = cipher.iv
    logging.debug(f"Blowfish encrypt: generated IV={iv.hex()}")
    padded = pad(data_bytes, Blowfish.block_size)
    logging.debug(f"Blowfish encrypt: padded length={len(padded)}")
    ct_bytes = cipher.encrypt(padded)
    logging.debug(f"Blowfish encrypt: ciphertext length={len(ct_bytes)}")
    result = iv + ct_bytes
    logging.debug(f"Blowfish encrypt: output length={len(result)}, prefix (IV+first bytes)={result[:32].hex()}")
    return result

def blowfish_decrypt(encrypted_bytes: bytes, key: bytes) -> bytes:
    logging.debug(f"Blowfish decrypt: total input length={len(encrypted_bytes)}, key length={len(key)}")
    iv = encrypted_bytes[:Blowfish.block_size]
    ct = encrypted_bytes[Blowfish.block_size:]
    logging.debug(f"Blowfish decrypt: IV={iv.hex()}, ciphertext length={len(ct)}")
    cipher = Blowfish.new(key, Blowfish.MODE_CBC, iv)
    pt_padded = cipher.decrypt(ct)
    logging.debug(f"Blowfish decrypt: decrypted padded length={len(pt_padded)}")
    pt = unpad(pt_padded, Blowfish.block_size)
    logging.debug(f"Blowfish decrypt: unpadded plaintext length={len(pt)}")
    return pt

def lsb_encrypt(image_bytes: bytes, message: str) -> bytes:
    """
    Embed a UTF-8 text message into the least significant bits of a color image.
    Uses a 32-bit header to store the message length in bytes.
    """
    logging.debug(f"LSB encrypt: image_bytes length={len(image_bytes)}, message length={len(message)}")
    # Decode image
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        logging.error("LSB encrypt: failed to decode image")
        raise ValueError("Invalid image data")
    h, w, c = img.shape
    max_bits = h * w * c

    # Prepare payload: 4-byte length header + UTF-8 message
    msg_bytes = message.encode('utf-8')
    msg_len = len(msg_bytes)
    header = msg_len.to_bytes(4, 'big')          # 32-bit length header
    payload = header + msg_bytes
    bits = ''.join(f"{b:08b}" for b in payload)

    logging.debug(f"LSB encrypt: total bits to embed={len(bits)}, capacity={max_bits}")
    if len(bits) > max_bits:
        logging.error("LSB encrypt: message too long for image capacity")
        raise ValueError("Message too long to embed in this image")

    # Embed bits using 0xFE mask instead of ~1 to stay in uint8 range
    flat = img.flatten()
    for i, bit in enumerate(bits):
        original = int(flat[i])
        masked   = original & 0xFE
        new_byte = masked | int(bit)
        flat[i]  = new_byte
        logging.debug(f"LSB encrypt: pixel[{i}] original={original} masked={masked} new={new_byte}")

    stego = flat.reshape(img.shape)
    success, encoded_img = cv2.imencode('.png', stego)
    if not success:
        logging.error("LSB encrypt: cv2.imencode failed")
        raise RuntimeError("Failed to encode stego image")

    result = encoded_img.tobytes()
    logging.debug(f"LSB encrypt: output length={len(result)}")
    return result


def lsb_decrypt(image_bytes: bytes) -> str:
    """
    Recover a UTF-8 text message from the least significant bits of a color image.
    Expects a 32-bit big-endian length header.
    """
    logging.debug(f"LSB decrypt: image_bytes length={len(image_bytes)}")
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        logging.error("LSB decrypt: failed to decode image")
        raise ValueError("Invalid image data")
    h, w, c = img.shape
    max_bits = h * w * c

    flat = img.flatten()

    # Read 32-bit length header
    header_bits = ''.join(str(int(flat[i]) & 1) for i in range(32))
    msg_len = int(header_bits, 2)
    total_bits = 32 + msg_len * 8

    logging.debug(f"LSB decrypt: declared message length={msg_len}, total bits={total_bits}, capacity={max_bits}")
    if total_bits > max_bits:
        logging.error("LSB decrypt: length header exceeds image capacity")
        raise ValueError("Corrupted data or wrong format")

    # Extract all bits (header + payload)
    all_bits = ''.join(str(int(flat[i]) & 1) for i in range(total_bits))

    # Skip the 32-bit header, reconstruct message bytes
    payload_bits = all_bits[32:]
    msg_bytes = bytearray()
    for i in range(0, len(payload_bits), 8):
        byte = int(payload_bits[i:i+8], 2)
        msg_bytes.append(byte)
        logging.debug(f"LSB decrypt: recovered byte {byte:#04x} from bits {payload_bits[i:i+8]}")

    message = msg_bytes.decode('utf-8')
    logging.debug(f"LSB decrypt: recovered message='{message}'")
    return message

# 4. Chaos-based Encryption (Logistic Map)
def logistic_map_encrypt(data_bytes: bytes, key: float = 3.99) -> bytes:
    """
    Encrypts/decrypts by XOR’ing each byte with a chaotic keystream generated
    from the logistic map x_{n+1} = key * x_n * (1 - x_n).  Requires 0 < key <= 4.0.
    """
    logging.debug(f"Logistic map encrypt: data length={len(data_bytes)}, key={key}")

    # 1) Validate key range
    if not (0.0 < key <= 4.0):
        logging.error(f"Chaos key out of valid range (0,4]: {key}")
        raise ValueError("Chaos key must be a float in the interval (0, 4].")

    # 2) Initialize the logistic map
    x = 0.5

    # 3) Preallocate keystream
    seq = bytearray(len(data_bytes))

    # 4) Generate chaotic keystream
    for i in range(len(data_bytes)):
        x = key * x * (1 - x)
        # clamp any floating‐point drift back into [0,1)
        x = x % 1.0
        byte = int(x * 255) & 0xFF
        seq[i] = byte

        # Log the first few entries for debugging
        if i < 8:
            logging.debug(f"  keystream[{i}] = {byte} (x={x:.6f})")

    # 5) XOR plaintext/ciphertext with keystream
    encrypted = bytes(b ^ s for b, s in zip(data_bytes, seq))
    logging.debug(f"Logistic map encrypt: output length={len(encrypted)}")

    return encrypted


def logistic_map_decrypt(encrypted_bytes: bytes, key: float = 3.99) -> bytes:
    """
    Decryption is identical to encryption (XOR cipher).
    """
    logging.debug(f"Logistic map decrypt: data length={len(encrypted_bytes)}, key={key}")
    # Re‐use the same routine so the keystream regenerates identically
    return logistic_map_encrypt(encrypted_bytes, key)


# 5. Hybrid Method: AES + Logistic map XOR
def hybrid_encrypt(data_bytes: bytes, aes_key: bytes, chaos_key: float = 3.99) -> bytes:
    logging.debug(f"Hybrid encrypt: data length={len(data_bytes)}, aes_key length={len(aes_key)}, chaos_key={chaos_key}")
    aes_blob = aes_encrypt(data_bytes, aes_key)
    logging.debug(f"Hybrid encrypt: after AES length={len(aes_blob)}")
    hybrid_blob = logistic_map_encrypt(aes_blob, chaos_key)
    logging.debug(f"Hybrid encrypt: output length={len(hybrid_blob)}")
    return hybrid_blob

def hybrid_decrypt(hybrid_encrypted: bytes, aes_key: bytes, chaos_key: float = 3.99) -> bytes:
    logging.debug(f"Hybrid decrypt: data length={len(hybrid_encrypted)}, aes_key length={len(aes_key)}, chaos_key={chaos_key}")
    aes_blob = logistic_map_decrypt(hybrid_encrypted, chaos_key)
    logging.debug(f"Hybrid decrypt: after logistic map length={len(aes_blob)}")
    plain = aes_decrypt(aes_blob, aes_key)
    logging.debug(f"Hybrid decrypt: final plaintext length={len(plain)}")
    return plain
