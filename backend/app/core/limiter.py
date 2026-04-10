from slowapi import Limiter
from slowapi.util import get_remote_address

# Single limiter instance shared across the whole app.
# Imported by main.py (to register with the app) and by
# individual routers (to apply @limiter.limit decorators).
limiter = Limiter(key_func=get_remote_address)