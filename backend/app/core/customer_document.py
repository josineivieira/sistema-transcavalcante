import re


def normalize_document(value: str) -> str:
    return re.sub(r"[.\/\s-]", "", value.upper())


def valid_customer_document(value: str, participant_type: str) -> bool:
    raw = normalize_document(value)
    if participant_type == "Exterior":
        return bool(value.strip()) and len(value.strip()) <= 30
    cpf = participant_type == "Fisica"
    pattern = r"[0-9]{11}" if cpf else r"[A-Z0-9]{12}[0-9]{2}"
    if not re.fullmatch(pattern, raw) or len(set(raw)) == 1:
        return False

    def digit(text: str) -> str:
        total = sum((ord(char) - 48) * (len(text) + 1 - index if cpf else (len(text) - 1 - index) % 8 + 2) for index, char in enumerate(text))
        remainder = total % 11
        return "0" if remainder < 2 else str(11 - remainder)

    base = raw[:-2]
    first = digit(base)
    return raw[-2:] == first + digit(base + first)
