from app.core.security import get_password_hash, verify_password


def test_password_hash_cycle():
    hashed = get_password_hash("123456")
    assert verify_password("123456", hashed)
