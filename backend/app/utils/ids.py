import random
import string
import uuid


def generate_run_pk() -> str:
    return uuid.uuid4().hex


def generate_run_display_id() -> str:
    digits = "".join(random.choices(string.digits, k=4))
    suffix = random.choice(string.ascii_uppercase)
    return f"RUN-{digits}-{suffix}"


def generate_case_display_id(sequence: int) -> str:
    return f"TC-{sequence:04d}"
