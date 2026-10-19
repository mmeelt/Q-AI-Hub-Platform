"""Selenium base for the Q-AI Hub test run (browser choice, UI login, screenshots)."""
import datetime as dt
import os, re, time
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import qa


def pytest_addoption(parser):
    parser.addoption('--browser', default='chrome', choices=['chrome', 'edge'])


@pytest.fixture(scope='session')
def browser_name(request):
    return request.config.getoption('--browser')


@pytest.fixture
def driver(request, browser_name):
    if browser_name == 'edge':
        opts = webdriver.EdgeOptions()
    else:
        opts = webdriver.ChromeOptions()
    opts.add_argument('--window-size=1440,1000')
    opts.add_argument('--lang=en-US')
    opts.add_argument('--headless=new')
    if browser_name == 'edge':
        # Edge driver matching the installed Edge (Selenium Manager's download address is retired)
        from selenium.webdriver.edge.service import Service
        # EDGEDRIVER: path to msedgedriver.exe matching the installed Edge, when Selenium Manager cannot download it
        driver_exe = os.environ.get('EDGEDRIVER')
        d = webdriver.Edge(options=opts, service=Service(driver_exe) if driver_exe else None)
    else:
        d = webdriver.Chrome(options=opts)
    d.implicitly_wait(0)
    d.ui = UI(d, f"{browser_name}-{request.node.name}")
    yield d
    if getattr(request.node, 'rep_call', None) and request.node.rep_call.failed:
        d.ui.shot('ECHEC')
    d.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, 'rep_' + rep.when, rep)


class UI:
    """Small helpers over the WebDriver: explicit waits, clicks by visible text, screenshots."""

    def __init__(self, d, name):
        self.d, self.name, self.n = d, re.sub(r'[^\w.-]+', '_', name), 0

    def wait(self, timeout=15):
        return WebDriverWait(self.d, timeout)

    def open(self, path):
        self.d.get(qa.APP + path)

    def shot(self, label):
        self.n += 1
        path = qa.SHOTS / f"{self.name}_{self.n:02d}_{re.sub(r'[^\w.-]+', '_', label)}.png"
        self.d.save_screenshot(str(path))
        return path

    def el(self, xpath, timeout=15):
        return self.wait(timeout).until(EC.visibility_of_element_located((By.XPATH, xpath)))

    def els(self, xpath):
        return [e for e in self.d.find_elements(By.XPATH, xpath) if e.is_displayed()]

    def click(self, xpath, timeout=15):
        e = self.wait(timeout).until(EC.element_to_be_clickable((By.XPATH, xpath)))
        self.d.execute_script('arguments[0].scrollIntoView({block: "center"});', e)
        try:
            e.click()
        except Exception:
            self.d.execute_script('arguments[0].click();', e)
        return e

    def button(self, text, timeout=15):
        """Clicks the button (or link) whose visible text contains `text`."""
        return self.click(f"//*[self::button or self::a][contains(normalize-space(.), {xq(text)})]", timeout)

    def type(self, xpath, text, clear=True):
        e = self.el(xpath)
        self.d.execute_script('arguments[0].scrollIntoView({block: "center"});', e)
        if clear:
            e.send_keys(Keys.CONTROL, 'a')
            e.send_keys(Keys.DELETE)
        e.send_keys(text)
        return e

    def text_visible(self, text, timeout=15):
        return self.el(f"//*[contains(normalize-space(.), {xq(text)}) and not(.//*[contains(normalize-space(.), {xq(text)})])]", timeout)

    def body(self):
        return self.d.find_element(By.TAG_NAME, 'body').text

    def accept_alert(self, timeout=10):
        alert = self.wait(timeout).until(EC.alert_is_present())
        alert.accept()

    # ── Screens shared by several cases ──────────────────────────

    def login(self, email, password, admin=False):
        """Login screen → e-mailed code screen (the code is read in the test inbox)."""
        self.open('/login')
        self.type("//input[@type='email']", email)
        self.type("//input[@type='password' or @placeholder='••••••••']", password)
        if admin:
            self.click("//span[contains(., 'Admin')]/preceding-sibling::button")
        _pace_code_checks()  # before the code is sent: it must not expire while waiting
        since = time.time() - 1
        self.click("//button[@type='submit']")
        self.wait().until(lambda d: '/otp' in d.current_url or '/dashboard' in d.current_url or '/admin' in d.current_url)
        if '/otp' in self.d.current_url:
            self.enter_code(email, since)

    def register(self, full_name, student_id, email, password):
        """Sign-up screen → e-mailed code screen."""
        self.open('/register')
        self.type("//input[@placeholder='Your full name']", full_name)
        self.type("//input[@placeholder='e.g. 2024-ENIC-XXXX']", student_id)
        self.type("//input[@placeholder='e.g. ENICarthage']", 'ENICarthage')
        self.type("//input[@type='email']", email)
        self.type("//input[@placeholder='Create a strong password']", password)
        self.type("//input[@placeholder='Repeat your password']", password)
        self.shot('inscription')
        _pace_code_checks()
        since = time.time() - 1
        self.click("//button[@type='submit']")
        self.wait(20).until(lambda d: '/otp' in d.current_url)
        self.shot('saisie_du_code')
        self.enter_code(email, since)

    def enter_code(self, email, since):
        code = qa.otp_code(email, since)
        self.type("//input[@autocomplete='one-time-code' or @data-input-otp='true']", code, clear=False)
        self.wait(20).until(lambda d: '/otp' not in d.current_url)

    def api_status(self, path):
        """Calls the API from inside the browser with its own session; returns the HTTP status."""
        return self.d.execute_async_script(
            "const done = arguments[1]; fetch(arguments[0], {credentials: 'include'}).then(r => done(r.status)).catch(() => done(0));",
            '/api' + path)

    def api_json(self, path):
        """GET on the API from inside the browser with its own session (no second login)."""
        return self.d.execute_async_script(
            "const done = arguments[1]; fetch(arguments[0], {credentials: 'include'}).then(r => r.json()).then(done).catch(() => done(null));",
            '/api' + path)

    def logout(self):
        self.d.delete_all_cookies()
        self.d.execute_script('localStorage.clear(); sessionStorage.clear();')

    def use_session(self, session, path='/'):
        """Opens the app already logged in with an API session (its cookies + the profile the UI keeps)."""
        self.open('/404-blank')
        for c in session.cookies:
            self.d.add_cookie({'name': c.name, 'value': c.value, 'path': c.path or '/', 'httpOnly': True})
        p = session.profile
        role = str(p.get('role') or 'USER').upper().replace('ROLE_', '')
        self.d.execute_script(
            "localStorage.setItem('isLoggedIn','true');localStorage.setItem('userEmail',arguments[0]);"
            "localStorage.setItem('userRole',arguments[1]);localStorage.setItem('userName',arguments[2]);"
            "if(arguments[3]) localStorage.setItem('userId',arguments[3]);",
            p.get('email') or '', role, p.get('fullName') or '', p.get('userId') or '')
        self.open(path)

    def pick_date(self, placeholder, date):
        """Opens the date picker showing `placeholder` and clicks `date` (navigating the months)."""
        self._close_popups()
        self.click(f"//button[.//span[normalize-space()={xq(placeholder)}]]")
        self.el("//div[@role='dialog']")
        target = date.strftime('%B %Y')
        for _ in range(36):
            caption = self.el("//div[@role='dialog']//*[contains(@class,'caption_label') or @role='presentation' or @aria-live='polite']").text
            if target in caption:
                break
            shown = dt.datetime.strptime(caption.strip(), '%B %Y').date()
            nav = 'next' if shown < date.replace(day=1) else 'previous'
            self.click(f"//div[@role='dialog']//button[contains(@name,'{nav}') or contains(@aria-label,'{nav}') or contains(@aria-label,'{nav.title()}')]")
        self.click(f"//div[@role='dialog']//button[@name='day' and normalize-space()='{date.day}' and not(contains(@class,'outside'))]")
        self._close_popups()

    def _close_popups(self):
        """Closes an open calendar and waits until it is gone (a late one would catch the next click)."""
        for _ in range(5):
            if not self.els("//div[@role='dialog']"):
                return
            self.d.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            time.sleep(0.4)
        assert not self.els("//div[@role='dialog']"), 'le calendrier ne se ferme pas'


_bucket = {'tokens': 5.0, 'at': time.time()}


def _pace_code_checks():
    """The app accepts 5 code checks per 15 minutes from one address (the browser always comes
    through 127.0.0.1): wait for a free slot instead of being refused."""
    now = time.time()
    _bucket['tokens'] = min(5.0, _bucket['tokens'] + (now - _bucket['at']) / 180.0)
    _bucket['at'] = now
    if _bucket['tokens'] < 1:
        wait = (1 - _bucket['tokens']) * 180 + 2
        print(f'\n[rythme] attente de {wait:.0f} s avant la prochaine saisie de code (limite 5 / 15 min)')
        time.sleep(wait)
        _bucket['tokens'], _bucket['at'] = 1.0, time.time()
    _bucket['tokens'] -= 1


def xq(text):
    """An XPath string literal for `text` (handles quotes)."""
    if "'" not in text:
        return f"'{text}'"
    if '"' not in text:
        return f'"{text}"'
    return "concat('" + text.replace("'", "', \"'\", '") + "')"
