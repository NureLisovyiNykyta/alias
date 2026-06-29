from dataclasses import dataclass
from enum import StrEnum


class ErrorMessage(StrEnum):
    EMAIL_TAKEN = "Email is already taken"
    EMAIL_DOMAIN_INVALID = "Email domain does not exist"
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
    CARD_PACK_SAVE_OWN = "You cannot save your own card pack"
    CARD_PACK_MIN_CARDS = "A card pack must contain at least {min_cards} cards to be activated."
    CARD_PACK_ACTIVE_MIN_CARDS = "An active card pack cannot have fewer than {min_cards} cards."
    CARD_INVALID_FORMAT = "Invalid card format: {detail}"
    CARD_NOT_FOUND_IN_PACK = "Card with ID {card_id} was not found in this card pack."

    MAP_THEME_NOT_FOUND = "Map theme not found"
    MAP_INVALID_SIZE = "Invalid map size. Must be SMALL, MEDIUM, or LARGE."
    MAP_NOT_FOUND = "Map not found"
    MAP_RATE_OWN = "You cannot rate your own map"
    MAP_SAVE_OWN = "You cannot save your own map"
    MAP_READY_FIELDS_COUNT = "The map must contain exactly {max_count} fields to be activated."
    MAP_ACTIVE_FIELDS_COUNT = "An active map must contain exactly {max_count} fields."
    MAP_FIELD_DUPLICATE_POSITIONS = "Map fields must not have duplicate position indices."
    MAP_FIELD_INDEX_OUT_OF_BOUNDS = "Field position index is out of template bounds."
    MAP_FIELD_NOT_FOUND_IN_MAP = "Map field with ID {field_id} was not found in this map."
    MAP_FIELD_INVALID_CARD_PACK = "The specified card_pack_id does not exist."
    MAP_FIELD_INACCESSIBLE_CARD_PACK = "One or more card packs are inaccessible or deleted."

    MAP_ALREADY_DELETED = "Map is already in the trash."
    MAP_NOT_IN_TRASH = "Map is not in the trash."
    MAP_ALREADY_PUBLISHED = "Map is already published."
    MAP_NOT_ACTIVE_FOR_PUBLISH = "Only active maps can be published."
    MAP_PUBLISH_PRIVATE_PACKS = "The map contains private card packs. Publish them first."

    CARD_PACK_ALREADY_DELETED = "Card pack is already in the trash."
    CARD_PACK_NOT_IN_TRASH = "Card pack is not in the trash."
    CARD_PACK_ALREADY_PUBLISHED = "Card pack is already published."
    CARD_PACK_NOT_ACTIVE_FOR_PUBLISH = "Only active card packs can be published."

    MAP_FIELD_PUBLIC_MAP_PRIVATE_PACK = "Cannot add private card packs to a public map."

    ACCOUNT_DELETED = "This account has been deleted"

    IMAGE_INVALID_FORMAT = "Unsupported image format. Allowed: JPEG, PNG, WebP"
    IMAGE_TOO_LARGE = "File is too large. Maximum size: {max_mb} MB"
    IMAGE_CORRUPTED = "The uploaded file is not a valid image"

    REDIS_NOT_INITIALISED = "Redis connection is not initialised. Call connect_to_redis() first."

    MAP_THEME_INCOMPLETE = "Selected theme is missing required assets for this map size"

    ROOM_NOT_FOUND = "Room not found"
    ROOM_FINISHED = "This room has already finished"
    ROOM_NOT_IN_LOBBY = "Room is not accepting new players"
    ROOM_GUEST_ID_REQUIRED = "guest_id is required for non-registered users"
    ROOM_PLAYER_NOT_FOUND = "Player not found in room"
    ROOM_HOST_CANNOT_LEAVE = "Host cannot leave the room, use close instead"

    WS_INVALID_MESSAGE = "Invalid message format"
    ROOM_NOT_HOST = "Only the host can perform this action"
    ROOM_NOT_ENOUGH_TEAMS = "Team count must be between {min} and {max}"
    ROOM_TEAM_INVALID_SIZE = "Team '{name}' does not meet player count requirements"

    ROOM_TEAM_NOT_FOUND = "Team not found"
    ROOM_TEAM_COLOR_TAKEN = "This team color is already taken"
    ROOM_TEAM_FULL = "Team is full"
    ROOM_PLAYER_NOT_IN_TEAM = "Player is not in this team"

    GAME_NOT_PLAYING = "Game is not in PLAYING status"
    GAME_NOT_EXPLAINER = "Only the current explainer can perform this action"
    GAME_WRONG_PHASE = "Action not allowed in the current turn phase"
    GAME_NO_CARDS_LEFT = "No cards left in the queue"
    GAME_CARD_NOT_IN_ROUND = "Card not found in current round"
    GAME_INVALID_CARD_STATUS = "Card status can only be changed to GUESSED or FAILED"
    GAME_CANNOT_KICK_SELF = "Cannot kick yourself"
    GAME_TARGET_TEAM_NOT_FOUND = "Target team not found"
    GAME_INVALID_TEAM_ORDER = "Provided team IDs don't match existing teams"
    GAME_LAST_TEAM = "Cannot delete the last team during a game"

    CHAT_MESSAGE_EMPTY = "Message cannot be empty"
    CHAT_MESSAGE_TOO_LONG = "Message too long. Maximum {max_length} characters"
    CHAT_NOT_IN_TEAM = "You must be in a team to send team messages"
    CHAT_TEAM_ONLY_IN_GAME = "Team chat is only available during the game"
    CHAT_GIF_URL_REQUIRED = "GIF message must include media_url"
    CHAT_GIF_URL_INVALID = "Only GIPHY URLs are allowed"

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
