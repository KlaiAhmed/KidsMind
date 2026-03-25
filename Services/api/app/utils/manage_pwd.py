from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

ph = PasswordHasher()

def hash_password(plain: str) -> str:
    """Hash a plain-text password using Argon2.

    Args:
        plain: Raw password string.

    Returns:
        Argon2 hashed password string.
    """
    return ph.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against an Argon2 hash.

    Args:
        plain: Raw password string to check.
        hashed: Stored Argon2 hash.

    Returns:
        True when the password matches; otherwise False.
    """
    try:
        return ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False