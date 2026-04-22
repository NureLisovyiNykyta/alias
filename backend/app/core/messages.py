from dataclasses import dataclass
from enum import StrEnum


class ErrorMessage(StrEnum):
    EMAIL_TAKEN = "Email is already taken"
    USERNAME_TAKEN = "Username is already taken"

    INVALID_CREDENTIALS = "Invalid email or password"
    USER_NOT_FOUND = "User not found"

    TOKEN_INVALID = "Token is invalid or expired"
    TOKEN_INVALID_TYPE = "Invalid token type"

    GOOGLE_TOKEN_INVALID = "Invalid Google token"

    EMAIL_ALREADY_VERIFIED = "Email is already verified"
    VERIFICATION_CODE_INVALID = "Invalid code"
    VERIFICATION_CODE_EXPIRED = "Code expired"

    GOOGLE_USER_NO_PASSWORD = "User is registered via Google"
    INVALID_OLD_PASSWORD = "Invalid old password"

    RESET_CODE_INVALID = "Invalid or expired reset code"


@dataclass
class EmailContent:
    subject: str
    title: str
    description: str


class EmailTemplate:
    VERIFY_EMAIL = EmailContent(
        subject="Verify your email",
        title="Verify your email address",
        description="Enter the code below in the app to confirm your email.",
    )
    RESET_PASSWORD = EmailContent(
        subject="Reset your password",
        title="Reset your password",
        description="Enter the code below to set a new password.",
    )
