"""
AES-256-GCM encryption utility for secrets management.
Uses versioned encoding: v1:<base64(nonce + ciphertext + tag)>
Uses HKDF for proper key derivation from master key.
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

ENCRYPTION_VERSION = "v1"
NONCE_SIZE = 12  # 96 bits recommended for GCM
KEY_SIZE = 32    # 256 bits for AES-256
HKDF_INFO = b"ai-crypto-trader-secrets-v1"


class SecretsCrypto:
    """Handles encryption/decryption of sensitive data using AES-256-GCM."""

    def __init__(self, master_key: str):
        key_bytes = self._derive_key(master_key)
        self._aesgcm = AESGCM(key_bytes)

    @staticmethod
    def _derive_key(master_key: str) -> bytes:
        """Derive a 32-byte AES key using HKDF."""
        key_material = master_key.encode("utf-8")
        if len(key_material) < 32:
            raise ValueError("MASTER_KEY must be at least 32 bytes")

        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=KEY_SIZE,
            salt=None,  # Using info for domain separation
            info=HKDF_INFO,
        )
        return hkdf.derive(key_material)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext and return versioned encoded string.
        Format: v1:<base64(nonce + ciphertext)>
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty string")

        nonce = os.urandom(NONCE_SIZE)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined = nonce + ciphertext
        encoded = base64.urlsafe_b64encode(combined).decode("ascii")
        return f"{ENCRYPTION_VERSION}:{encoded}"

    def decrypt(self, encrypted: str) -> str:
        """
        Decrypt versioned encoded string back to plaintext.
        """
        if not encrypted:
            raise ValueError("Cannot decrypt empty string")

        if not encrypted.startswith(f"{ENCRYPTION_VERSION}:"):
            raise ValueError(f"Unsupported encryption version: {encrypted[:10]}")

        encoded = encrypted[len(ENCRYPTION_VERSION) + 1:]
        combined = base64.urlsafe_b64decode(encoded)

        if len(combined) < NONCE_SIZE + 16:  # nonce + minimum tag size
            raise ValueError("Invalid ciphertext: too short")

        nonce = combined[:NONCE_SIZE]
        ciphertext = combined[NONCE_SIZE:]
        plaintext = self._aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")

    @staticmethod
    def mask_key(key: str, visible_prefix: int = 4, visible_suffix: int = 4) -> str:
        """
        Mask a key for display purposes.
        Example: "sk-abc123xyz789" -> "sk-a***9789"
        """
        if not key:
            return "***"
        if len(key) <= visible_prefix + visible_suffix:
            return "*" * len(key)
        return f"{key[:visible_prefix]}***{key[-visible_suffix:]}"


# Singleton instance - initialized lazily
_crypto_instance: SecretsCrypto | None = None


def get_crypto() -> SecretsCrypto:
    """Get or create the singleton SecretsCrypto instance."""
    global _crypto_instance
    if _crypto_instance is None:
        from app.core.settings import settings
        _crypto_instance = SecretsCrypto(settings.MASTER_KEY)
    return _crypto_instance


def encrypt_secret(plaintext: str) -> str:
    """Convenience function to encrypt a secret."""
    return get_crypto().encrypt(plaintext)


def decrypt_secret(encrypted: str) -> str:
    """Convenience function to decrypt a secret."""
    return get_crypto().decrypt(encrypted)


def mask_secret(key: str) -> str:
    """Convenience function to mask a key for display."""
    return SecretsCrypto.mask_key(key)
