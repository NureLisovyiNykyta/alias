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

    CARD_TYPE_NOT_FOUND = "Card type not found"
    CARD_PACK_NOT_FOUND = "Card pack not found"
    CARD_PACK_RATE_OWN = "You cannot rate your own card pack"
    CARD_PACK_MIN_CARDS = "A card pack must contain at least {min_cards} cards to be activated."
    CARD_PACK_ACTIVE_MIN_CARDS = "An active card pack cannot have fewer than {min_cards} cards."
    CARD_INVALID_FORMAT = "Invalid card format: {detail}"
    CARD_NOT_FOUND_IN_PACK = "Card with ID {card_id} was not found in this card pack."

    MAP_TEMPLATE_NOT_FOUND = "Map template not found"
    MAP_NOT_FOUND = "Map not found"
    MAP_RATE_OWN = "You cannot rate your own map"
    MAP_READY_FIELDS_COUNT = "The map must contain exactly {max_count} fields to be activated."
    MAP_ACTIVE_FIELDS_COUNT = "An active map must contain exactly {max_count} fields."
    MAP_FIELD_DUPLICATE_POSITIONS = "Map fields must not have duplicate position indices."
    MAP_FIELD_INDEX_OUT_OF_BOUNDS = "Field position index is out of template bounds."
    MAP_FIELD_NOT_FOUND_IN_MAP = "Map field with ID {field_id} was not found in this map."
    MAP_FIELD_INVALID_CARD_PACK = "The specified card_pack_id does not exist."


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
