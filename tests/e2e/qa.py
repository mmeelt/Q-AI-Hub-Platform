"""Shared helpers for the Q-AI Hub test run: the test app's URLs, the fake inbox and API sessions.

The app limits code checks to 5 per 15 minutes per address. API calls made to prepare the data
therefore go straight to the test backend, each session from its own loopback address (127.0.0.x),
and the browser reuses those sessions; the real login screens are used where the case is the login.
"""
import itertools, json, re, time
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter

HERE = Path(__file__).parent
APP = 'http://localhost:5174'          # test frontend (proxies /api to the test backend)
API = 'http://127.0.0.1:8082/api'      # test backend, for the data the cases need beforehand
MAILS = HERE / 'mails'
SHOTS = HERE / 'screenshots'
SHOTS.mkdir(exist_ok=True)

ADMIN_EMAIL = 'qaihubb@gmail.com'      # seeded admin of the test database
ADMIN_PASSWORD = 'E2eAdmin!2026'
PASSWORD = 'Str0ng!Passw0rd'           # password of the test accounts created during the run

_addresses = (f'127.0.0.{i}' for i in itertools.cycle(range(2, 255)))


class _FromAddress(HTTPAdapter):
    def __init__(self, address):
        self.address = address
        super().__init__()

    def init_poolmanager(self, *args, **kwargs):
        kwargs['source_address'] = (self.address, 0)
        super().init_poolmanager(*args, **kwargs)


def new_session():
    s = requests.Session()
    s.mount('http://', _FromAddress(next(_addresses)))
    s.profile = {}
    return s


def mails_to(address, since=0.0):
    out = []
    for f in sorted(MAILS.glob('*.json')):
        m = json.loads(f.read_text(encoding='utf-8'))
        if address.lower() in m['to'] and m['at'] >= since:
            out.append(m)
    return out


def wait_mail(address, since, pattern=None, timeout=30):
    """The newest e-mail to `address` received after `since` (optionally whose subject/body matches)."""
    end = time.time() + timeout
    while time.time() < end:
        for m in reversed(mails_to(address, since)):
            if pattern is None or re.search(pattern, m['subject'] + '\n' + m['body'], re.I | re.S):
                return m
        time.sleep(0.5)
    raise AssertionError(f'no e-mail for {address} (pattern={pattern})')


def otp_code(address, since):
    m = wait_mail(address, since, r'\b\d{6}\b')
    return re.search(r'\b(\d{6})\b', m['body']).group(1)


def _verify(s, email, body, since):
    if not body.get('requiresOtp'):
        s.profile = body
        return s
    code = otp_code(email, since)
    r = s.post(API + '/auth/verify-otp', json={'email': email, 'otpCode': code, 'otpSessionId': body['otpSessionId']})
    r.raise_for_status()
    s.profile = r.json()
    return s


def admin_session():
    """An API session logged in as the test admin (password + e-mailed code)."""
    s = new_session()
    t = time.time() - 1
    r = s.post(API + '/admin/login', json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    r.raise_for_status()
    return _verify(s, ADMIN_EMAIL, r.json(), t)


def user_session(email, password=PASSWORD):
    s = new_session()
    t = time.time() - 1
    r = s.post(API + '/auth/login', json={'email': email, 'password': password})
    r.raise_for_status()
    return _verify(s, email, r.json(), t)


def register(email, full_name, **extra):
    """Creates and verifies an account through the API (sign-up + e-mailed code); logs in if it exists."""
    s = new_session()
    t = time.time() - 1
    payload = {'email': email, 'password': PASSWORD, 'fullName': full_name,
               'universityName': 'ENICarthage', **extra}
    r = s.post(API + '/auth/register', json=payload)
    if r.status_code == 409 or (r.status_code == 400 and 'exist' in r.text.lower()):
        return user_session(email)  # already created by an earlier run
    r.raise_for_status()
    return _verify(s, email, r.json(), t)
