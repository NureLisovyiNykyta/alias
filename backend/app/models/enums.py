import enum


class StatusEnum(enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class CardMechanicEnum(enum.Enum):
    CLASSIC_ALIAS = "CLASSIC_ALIAS"
