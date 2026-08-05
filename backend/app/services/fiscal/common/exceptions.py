class FiscalIntegrationError(RuntimeError):
    """Falha técnica ou de comunicação com o provedor fiscal."""


class FiscalValidationError(ValueError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))
