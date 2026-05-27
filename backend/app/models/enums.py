import enum


class StatusEnum(enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"


class CardMechanicEnum(enum.Enum):
    CLASSIC_ALIAS = "CLASSIC_ALIAS"


class MapSizeEnum(enum.Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"
