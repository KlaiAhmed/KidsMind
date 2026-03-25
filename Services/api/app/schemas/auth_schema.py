from pydantic import EmailStr, BaseModel, Field, field_validator
import re

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        errors = []

        if len(value) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", value):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", value):
            errors.append("one lowercase letter")
        if not re.search(r"\d", value):
            errors.append("one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            errors.append("one special character (!@#$...)")

        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")

        return value
