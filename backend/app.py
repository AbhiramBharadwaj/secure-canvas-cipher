import os
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from base64 import b64encode, b64decode
from encryption_algorithms import *
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s] %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# Folder setup for storing encrypted and decrypted files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENCRYPTED_FOLDER = os.path.join(BASE_DIR, 'encrypted')
DECRYPTED_FOLDER = os.path.join(BASE_DIR, 'decrypted')
os.makedirs(ENCRYPTED_FOLDER, exist_ok=True)
os.makedirs(DECRYPTED_FOLDER, exist_ok=True)

def parse_key(key_str: str, required_len: int):
    logging.debug(f"Parsing key: '{key_str}' to length {required_len}")
    key_bytes = key_str.encode()
    if len(key_bytes) < required_len:
        key_bytes = key_bytes.ljust(required_len, b'\0')
    else:
        key_bytes = key_bytes[:required_len]
    logging.debug(f"Parsed key bytes: {key_bytes}")
    return key_bytes

@app.route('/encrypt', methods=['POST', 'OPTIONS'])
def encrypt():
    if request.method == 'OPTIONS':
        logging.debug("Received OPTIONS request at /encrypt")
        return '', 200

    data = request.json
    logging.info(f"Encryption request received: {data.keys()}")
    
    image_b64 = data.get('image')
    key = data.get('key', '')
    algorithm = data.get('algorithm')

    if not image_b64 or not algorithm:
        logging.error("Missing image data or algorithm in request")
        return jsonify({'error': 'Missing data'}), 400

    try:
        image_bytes = b64decode(image_b64)
        logging.debug(f"Decoded image bytes length: {len(image_bytes)}")

        if algorithm == 'aes':
            key_bytes = parse_key(key, 16)
            encrypted = aes_encrypt(image_bytes, key_bytes)

        elif algorithm == 'blowfish':
            key_bytes = parse_key(key, 16)
            encrypted = blowfish_encrypt(image_bytes, key_bytes)

        elif algorithm == 'lsb':
            message = key or "Secret"
            encrypted = lsb_encrypt(image_bytes, message)

        elif algorithm == 'chaos':
            chaos_key = float(key) if key else 3.99
            encrypted = logistic_map_encrypt(image_bytes, chaos_key)

        elif algorithm == 'hybrid':
            key_bytes = parse_key(key, 16)
            chaos_key = 3.99
            encrypted = hybrid_encrypt(image_bytes, key_bytes, chaos_key)

        else:
            logging.error(f"Invalid encryption algorithm requested: {algorithm}")
            return jsonify({'error': 'Invalid algorithm'}), 400

        # Save encrypted bytes to file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        encrypted_filename = f"encrypted_{timestamp}.png"
        encrypted_filepath = os.path.join(ENCRYPTED_FOLDER, encrypted_filename)
        with open(encrypted_filepath, 'wb') as f:
            f.write(encrypted)
        logging.info(f"Encrypted file saved: {encrypted_filepath}")

        encrypted_b64 = b64encode(encrypted).decode('utf-8')
        logging.info(f"Encryption successful for algorithm: {algorithm}")
        return jsonify({
            'encrypted_image': encrypted_b64,
            'encrypted_file_url': f"/download/encrypted/{encrypted_filename}",
            'encrypted_filename': encrypted_filename
        })

    except Exception as e:
        logging.exception("Encryption failed")
        return jsonify({'error': str(e)}), 500

@app.route('/decrypt', methods=['POST', 'OPTIONS'])
def decrypt():
    if request.method == 'OPTIONS':
        logging.debug("Received OPTIONS request at /decrypt")
        return '', 200

    data = request.json
    logging.info(f"Decryption request received: {data.keys()}")

    encrypted_b64 = data.get('encrypted_image')
    key = data.get('key', '')
    algorithm = data.get('algorithm')

    if not encrypted_b64 or not algorithm:
        logging.error("Missing encrypted image data or algorithm in request")
        return jsonify({'error': 'Missing data'}), 400

    try:
        encrypted_bytes = b64decode(encrypted_b64)
        logging.debug(f"Decoded encrypted bytes length: {len(encrypted_bytes)}")

        if algorithm == 'aes':
            key_bytes = parse_key(key, 16)
            decrypted = aes_decrypt(encrypted_bytes, key_bytes)

        elif algorithm == 'blowfish':
            key_bytes = parse_key(key, 16)
            decrypted = blowfish_decrypt(encrypted_bytes, key_bytes)

        elif algorithm == 'lsb':
            decrypted_message = lsb_decrypt(encrypted_bytes)
            logging.info("LSB decryption successful")
            return jsonify({'decrypted_message': decrypted_message})

        elif algorithm == 'chaos':
            chaos_key = float(key) if key else 3.99
            decrypted = logistic_map_decrypt(encrypted_bytes, chaos_key)

        elif algorithm == 'hybrid':
            key_bytes = parse_key(key, 16)
            chaos_key = 3.99
            decrypted = hybrid_decrypt(encrypted_bytes, key_bytes, chaos_key)

        else:
            logging.error(f"Invalid decryption algorithm requested: {algorithm}")
            return jsonify({'error': 'Invalid algorithm'}), 400

        # Save decrypted bytes to file (assuming PNG)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        decrypted_filename = f"decrypted_{timestamp}.png"
        decrypted_filepath = os.path.join(DECRYPTED_FOLDER, decrypted_filename)
        with open(decrypted_filepath, 'wb') as f:
            f.write(decrypted)
        logging.info(f"Decrypted file saved: {decrypted_filepath}")

        decrypted_b64 = b64encode(decrypted).decode('utf-8')
        logging.info(f"Decryption successful for algorithm: {algorithm}")
        return jsonify({
            'decrypted_image': decrypted_b64,
            'decrypted_file_url': f"/download/decrypted/{decrypted_filename}",
            'decrypted_filename': decrypted_filename
        })

    except Exception as e:
        logging.exception("Decryption failed")
        return jsonify({'error': str(e)}), 500

@app.route('/download/encrypted/<filename>', methods=['GET'])
def download_encrypted(filename):
    return send_from_directory(ENCRYPTED_FOLDER, filename, as_attachment=True)

@app.route('/download/decrypted/<filename>', methods=['GET'])
def download_decrypted(filename):
    return send_from_directory(DECRYPTED_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    logging.info("Starting Flask encryption API server...")
    app.run(port=5050, debug=True)
