from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

ph = PasswordHasher()

def hash_password(plain: str) -> str:
    return ph.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Args:
        plain (str): The plain password to verify.
        hashed (str): The hashed password to verify against.
    Returns:
        bool: True if the password is correct, False otherwise.
    """
    try:
        return ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False