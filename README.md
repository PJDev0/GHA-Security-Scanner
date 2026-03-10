# Python Cryptography Toolkit

Command-line tool for cryptography: SHA-256, AES-256, RSA-2048, bcrypt.

A comprehensive command-line tool for learning and applying modern cryptography concepts in Python. This toolkit demonstrates industry-standard encryption, hashing, and password security techniques through an interactive interface.

## Features

### Cryptographic Algorithms

| Algorithm | Type | Purpose |
|-----------|------|---------|
| **SHA-256** | Hashing | File integrity verification and checksums |
| **AES-256-GCM** | Symmetric Encryption | Secure data encryption with authentication |
| **RSA-2048** | Asymmetric Encryption | Public-key encryption and secure communication |
| **bcrypt** | Password Hashing | Secure password storage with adaptive hashing |
| **zxcvbn** | Strength Analysis | Realistic password strength estimation |

### Capabilities

- **File Hashing**: Generate and verify SHA-256 checksums to detect file tampering
- **Symmetric Encryption**: Encrypt/decrypt messages using AES-256 with authenticated encryption
- **Asymmetric Encryption**: Generate RSA key pairs and encrypt messages with public keys
- **Password Security**: Analyze password strength and hash passwords securely with bcrypt
- **Interactive CLI**: Menu-driven interface for easy testing and experimentation

## Installation

### Prerequisites
- Python 3.7 or higher
- pip package manager

### Setup


```bash
git clone https://github.com/YOUR_USERNAME/crypto-toolkit.git
cd crypto-toolkit
python -m venv venv
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

python main.py

or

python hasher.py              # SHA-256 file hashing demo
python symmetric_crypto.py    # AES-256 encryption demo
python asymmetric_crypto.py   # RSA encryption demo
python password_security.py   # Password security demo

How It Works
SHA-256 File Hashing
Creates a unique 64-character fingerprint of any file. If even one bit changes, the hash changes completely. This is one-way - you cannot reverse a hash back to the original file.
AES-256 Symmetric Encryption
Uses the same 256-bit key to encrypt and decrypt data. AES-GCM mode provides both confidentiality and authentication (tamper-proofing). Lose the key = lose the data forever.
RSA-2048 Asymmetric Encryption
Uses mathematically linked key pairs:

    Public key: Encrypts data, can be shared openly
    Private key: Decrypts data, must be kept secret

This solves the key distribution problem - anyone can encrypt messages that only you can read.
bcrypt Password Hashing
Purposefully slow hashing algorithm designed for passwords:

    Automatically generates random salt for each password
    Adaptive cost factor (default 12 rounds) gets slower over time
    Prevents rainbow table and brute-force attacks

Security Warnings
IMPORTANT: This tool is for educational purposes. For production use:

    Never hardcode encryption keys in source code
    Use environment variables or secure key management services
    Keep private keys and password hashes confidential
    This repository includes .gitignore rules to prevent accidental commits of sensitive files

    Dependencies

    cryptography (42.0.5+) - Modern cryptographic recipes and primitives
    bcrypt (4.1.2+) - Modern password hashing
    zxcvbn (4.4.28+) - Realistic password strength estimation

License
MIT License - See LICENSE file for details.
Acknowledgments
Based on the freeCodeCamp "Cryptography for Beginners - Full Python Course" tutorial.