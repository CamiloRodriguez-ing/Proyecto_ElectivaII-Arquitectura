class DomainError(Exception):
    def __init__(self, code: str, message: str, details: list[dict[str, str]] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or []


class ValidationError(DomainError):
    pass


class StateTransitionError(DomainError):
    pass
