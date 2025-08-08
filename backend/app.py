import os
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from base64 import b64encode, b64decode
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256
from encryption_algorithms import (
    aes_encrypt,
    aes_decrypt,
    blowfish_encrypt,
    blowfish_decrypt,
    lsb_encrypt,
    lsb_decrypt,
    logistic_map_encrypt,
    logistic_map_decrypt,
    hybrid_encrypt,
    hybrid_decrypt,
)
from flask_cors import CORS

# ─── Logging Configuration ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# ─── Flask App & CORS ───────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ─── Storage Folders ────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENCRYPTED_FOLDER = os.path.join(BASE_DIR, 'encrypted')
DECRYPTED_FOLDER = os.path.join(BASE_DIR, 'decrypted')
os.makedirs(ENCRYPTED_FOLDER, exist_ok=True)
os.makedirs(DECRYPTED_FOLDER, exist_ok=True)

# ─── Helper: Derive AES Key from Passphrase ─────────────────────────────────────
def derive_key_from_passphrase(
    passphrase: str,
    salt: bytes = None,
    key_len: int = 32
) -> tuple[bytes, bytes]:
    """
    PBKDF2-based key derivation:
      - passphrase: user-supplied string
      - salt: 16-byte value; if None, generates a new random salt
      - key_len: output length in bytes (32 for AES-256)
    Returns (salt, derived_key).
    """
    if salt is None:
        salt = os.urandom(16)
        logging.debug(f"Generated new salt: {salt.hex()}")
    key = PBKDF2(
        passphrase,
        salt,
        dkLen=key_len,
        count=100_000,
        hmac_hash_module=SHA256
    )
    logging.debug(f"Derived key ({key_len*8}-bit) from passphrase '{passphrase}'")
    return salt, key

# ─── (Legacy) Helper: Zero-pad/truncate generic key for other algos ─────────────
def parse_key(key_str: str, required_len: int) -> bytes:
    """
    Turns any string into a fixed-length byte key by:
      - UTF-8 encoding
      - right-padding with NULs if too short
      - truncating if too long
    Used by Blowfish and Hybrid modes below.
    """
    logging.debug(f"Parsing key: '{key_str}' to length {required_len}")
    key_bytes = key_str.encode('utf-8')
    if len(key_bytes) < required_len:
        key_bytes = key_bytes.ljust(required_len, b'\0')
    else:
        key_bytes = key_bytes[:required_len]
    logging.debug(f"Parsed key bytes: {key_bytes!r}")
    return key_bytes

# ─── /encrypt Endpoint ──────────────────────────────────────────────────────────
@app.route('/encrypt', methods=['POST', 'OPTIONS'])
def encrypt():
    if request.method == 'OPTIONS':
        logging.debug("Received OPTIONS request at /encrypt")
        return '', 200

    data = request.json or {}
    logging.info(f"Encryption request received: {list(data.keys())}")

    image_b64  = data.get('image')
    key_pass   = data.get('key', '')
    algorithm  = data.get('algorithm')

    if not image_b64 or not algorithm:
        logging.error("Missing image data or algorithm in request")
        return jsonify({'error': 'Missing data'}), 400

    # Require non-empty passphrase for AES
    if algorithm == 'aes' and not key_pass:
        logging.error("AES encryption requested without a passphrase")
        return jsonify({'error': 'Passphrase is required for AES encryption'}), 400

    try:
        image_bytes = b64decode(image_b64)
        logging.debug(f"Decoded image bytes length: {len(image_bytes)}")

        # ─── AES-CBC w/ PBKDF2 Key Derivation ───────────────────────────────
        if algorithm == 'aes':
            salt, key_bytes = derive_key_from_passphrase(key_pass, None, key_len=32)
            aes_payload = aes_encrypt(image_bytes, key_bytes)      # IV||ciphertext
            encrypted = salt + aes_payload
            logging.debug("Encrypted blob prefix (salt+IV): " + encrypted[:32].hex())

        # ─── Blowfish (legacy) ───────────────────────────────────────────────
        elif algorithm == 'blowfish':
            key_bytes = parse_key(key_pass, 16)
            encrypted = blowfish_encrypt(image_bytes, key_bytes)

        # ─── LSB Steganography ───────────────────────────────────────────────
        elif algorithm == 'lsb':
            message   = key_pass or "Secret"
            encrypted = lsb_encrypt(image_bytes, message)

        # ─── Chaos-based (logistic map) ──────────────────────────────────────
        elif algorithm == 'chaos':
            chaos_key = float(key_pass) if key_pass else 3.99
            encrypted = logistic_map_encrypt(image_bytes, chaos_key)

        # ─── Hybrid Method (chaos + AES) ────────────────────────────────────
        elif algorithm == 'hybrid':
            key_bytes = parse_key(key_pass, 16)
            chaos_key = 3.99
            encrypted = hybrid_encrypt(image_bytes, key_bytes, chaos_key)

        else:
            logging.error(f"Invalid encryption algorithm requested: {algorithm}")
            return jsonify({'error': 'Invalid algorithm'}), 400

        # ─── Save encrypted blob ─────────────────────────────────────────────
        timestamp          = datetime.now().strftime("%Y%m%d%H%M%S")
        encrypted_filename = f"encrypted_{timestamp}.png"
        encrypted_path     = os.path.join(ENCRYPTED_FOLDER, encrypted_filename)
        with open(encrypted_path, 'wb') as f:
            f.write(encrypted)
        logging.info(f"Encrypted file saved: {encrypted_path}")

        encrypted_b64 = b64encode(encrypted).decode('utf-8')
        logging.info(f"Encryption successful for algorithm: {algorithm}")

        return jsonify({
            'encrypted_image':     encrypted_b64,
            'encrypted_file_url':  f"/download/encrypted/{encrypted_filename}",
            'encrypted_filename':  encrypted_filename
        })

    except Exception as e:
        logging.exception("Encryption failed")
        return jsonify({'error': str(e)}), 500

# ─── /decrypt Endpoint ──────────────────────────────────────────────────────────
@app.route('/decrypt', methods=['POST', 'OPTIONS'])
def decrypt():
    if request.method == 'OPTIONS':
        logging.debug("Received OPTIONS request at /decrypt")
        return '', 200

    data = request.json or {}
    logging.info(f"Decryption request received: {list(data.keys())}")

    encrypted_b64 = data.get('encrypted_image')
    key_pass      = data.get('key', '')
    algorithm     = data.get('algorithm')

    if not encrypted_b64 or not algorithm:
        logging.error("Missing encrypted image data or algorithm in request")
        return jsonify({'error': 'Missing data'}), 400

    # Require non-empty passphrase for AES
    if algorithm == 'aes' and not key_pass:
        logging.error("AES decryption requested without a passphrase")
        return jsonify({'error': 'Passphrase is required for AES decryption'}), 400

    try:
        encrypted_bytes = b64decode(encrypted_b64)
        logging.debug(f"Decoded encrypted bytes length: {len(encrypted_bytes)}")

        # ─── AES-CBC w/ PBKDF2 Key Re-Derivation ────────────────────────────
        if algorithm == 'aes':
            logging.debug("Received cipher blob prefix: " + encrypted_bytes[:32].hex())
            salt     = encrypted_bytes[:16]
            logging.debug(f"Re-deriving key with salt: {salt.hex()}")
            aes_blob, = (encrypted_bytes[16:],)
            _, key_bytes = derive_key_from_passphrase(key_pass, salt, key_len=32)
            decrypted = aes_decrypt(aes_blob, key_bytes)
            try:
                decrypted = aes_decrypt(aes_blob, key_bytes)
            except ValueError as e:
                # PKCS#7 padding failed → almost certainly wrong passphrase
                logging.error("AES decryption padding error (wrong passphrase?)")
                return jsonify({'error': 'Incorrect passphrase or corrupted data'}), 400


        # ─── Blowfish (legacy) ───────────────────────────────────────────────
        elif algorithm == 'blowfish':
            key_bytes = parse_key(key_pass, 16)
            decrypted = blowfish_decrypt(encrypted_bytes, key_bytes)
            try:
                decrypted = blowfish_decrypt(encrypted_bytes, key_bytes)
            except ValueError:
                logging.error("Blowfish decryption padding error (wrong key?)")
                return jsonify({'error': 'Incorrect key or corrupted data'}), 400

        # ─── LSB Steganography ───────────────────────────────────────────────
        elif algorithm == 'lsb':
            message = lsb_decrypt(encrypted_bytes)
            logging.info("LSB decryption successful")
            return jsonify({'decrypted_message': message})

        # ─── Chaos-based (logistic map) ──────────────────────────────────────
        elif algorithm == 'chaos':
            chaos_key = float(key_pass) if key_pass else 3.99
            decrypted = logistic_map_decrypt(encrypted_bytes, chaos_key)

        # ─── Hybrid Method (chaos + AES) ────────────────────────────────────
        elif algorithm == 'hybrid':
            key_bytes = parse_key(key_pass, 16)
            chaos_key = 3.99
            decrypted = hybrid_decrypt(encrypted_bytes, key_bytes, chaos_key)

        else:
            logging.error(f"Invalid decryption algorithm requested: {algorithm}")
            return jsonify({'error': 'Invalid algorithm'}), 400

        # ─── Save decrypted blob ─────────────────────────────────────────────
        timestamp          = datetime.now().strftime("%Y%m%d%H%M%S")
        decrypted_filename = f"decrypted_{timestamp}.png"
        decrypted_path     = os.path.join(DECRYPTED_FOLDER, decrypted_filename)
        with open(decrypted_path, 'wb') as f:
            f.write(decrypted)
        logging.info(f"Decrypted file saved: {decrypted_path}")

        decrypted_b64 = b64encode(decrypted).decode('utf-8')
        logging.info(f"Decryption successful for algorithm: {algorithm}")

        return jsonify({
            'decrypted_image':     decrypted_b64,
            'decrypted_file_url':  f"/download/decrypted/{decrypted_filename}",
            'decrypted_filename':  decrypted_filename
        })

    except Exception as e:
        logging.exception("Unexpected decryption error")
        return jsonify({'error': 'Server error during decryption'}), 500

# ─── Download Routes ────────────────────────────────────────────────────────────
@app.route('/download/encrypted/<filename>', methods=['GET'])
def download_encrypted(filename):
    return send_from_directory(ENCRYPTED_FOLDER, filename, as_attachment=True)

@app.route('/download/decrypted/<filename>', methods=['GET'])
def download_decrypted(filename):
    return send_from_directory(DECRYPTED_FOLDER, filename, as_attachment=True)

# ─── Main ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    logging.info("Starting Flask encryption API server on port 5050...")
    app.run(port=5050, debug=True)
