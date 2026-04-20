from enum import StrEnum


class ErrorMessage(StrEnum):
    EMAIL_TAKEN = "Email is already taken"
    USERNAME_TAKEN = "Username is already taken"

    INVALID_CREDENTIALS = "Invalid email or password"
    USER_NOT_FOUND = "User not found"

    TOKEN_INVALID = "Token is invalid or expired"
    TOKEN_INVALID_TYPE = "Invalid token type"
