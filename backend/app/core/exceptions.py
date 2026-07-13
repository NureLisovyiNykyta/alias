class AppException(Exception):
    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail

        super().__init__(self.detail)


class BadRequestError(AppException):
    status_code = 400
    detail = "Bad request"


class UnauthorizedError(AppException):
    status_code = 401
    detail = "Unauthorized"


class ForbiddenError(AppException):
    status_code = 403
    detail = "Forbidden"


class NotFoundError(AppException):
    status_code = 404
    detail = "Not found"


class AlreadyExistsError(AppException):
    status_code = 409
    detail = "Already exists"


class BusinessLogicError(AppException):
    status_code = 422
    detail = "Business logic error"
