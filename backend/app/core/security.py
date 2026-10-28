import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verifies a plain password against the stored PBKDF2 hashed password."""
    if not hashed_password or not plain_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) == 3 and parts[0].startswith("pbkdf2:sha256"):
            iterations = int(parts[0].split(":")[2])
            salt = parts[1]
            expected_key = parts[2]
            key = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations,
            )
            return hmac.compare_digest(key.hex(), expected_key)
        # Fallback for plain text matching during migration / initial demo
        if hashed_password == plain_password:
            return True
        return False
    except Exception:
        return False

