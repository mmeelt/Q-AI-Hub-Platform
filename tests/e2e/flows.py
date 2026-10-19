"""Steps reused by the system and acceptance cases (the same screens as the functional cases)."""
import datetime as dt
import json, re, time
from selenium.webdriver.support.ui import Select
import qa
from conftest import xq


# ── Data prepared through the API (preconditions) ─────────────────

def incubation_event(admin, title, pitch=True):
    """An active INCUBATION event (its phases are created with it)."""
    existing = next((e for e in admin.get(qa.API + '/admin/events').json() if e['title'] == title), None)
    if existing:
        return existing
    r = admin.post(qa.API + '/events', json={
        'title': title, 'category': 'Hackathon', 'eventType': 'INCUBATION', 'hasPitch': pitch,
        'description': "Programme d'incubation de startups en IA et informatique quantique.",
        'startDate': '2026-11-01', 'endDate': '2026-11-30', 'applicationDeadline': '2026-10-31', 'location': 'ENICarthage'})
    assert r.ok, r.text
    event = r.json()
    assert admin.put(qa.API + f"/events/{event['eventId']}/activate").ok
    return event


def student_with_application(email, name, startup, event_id):
    """A student account, its startup and a pending application to the event."""
    s = qa.register(email, name)
    mine = s.get(qa.API + '/startups/my').json()
    st = next((x for x in mine if x.get('projectName') == startup), None)
    if not st:
        r = s.post(qa.API + '/startups', json={'projectName': startup, 'businessSector': 'EdTech',
                                              'rawDescription': f'{startup} : startup de test.'})
        assert r.ok, r.text
        st = r.json()
    apps = [a for a in s.get(qa.API + '/applications/my').json() if a['targetEventId'] == event_id]
    if apps:
        return s, apps[0]
    r = s.post(qa.API + '/applications/submit', json={'targetEventId': event_id, 'linkedStartupId': st['startupId'],
                                                    'initialApplicationAnswers': json.dumps({'rawDescription': f'{startup} : dossier de candidature.'})})
    assert r.ok, r.text
    return s, r.json()


def invite_jury(admin, email, event_id):
    """Invites the expert to the event; creates the account from the e-mailed invitation the first time."""
    since = time.time() - 1
    assert admin.post(qa.API + '/admin/invite-expert', json={'email': email, 'expertRole': 'Judge', 'eventId': event_id}).ok
    try:
        return qa.user_session(email)
    except Exception:
        invite = qa.wait_mail(email, since, r'invite=')
        token = re.search(r'invite=([\w-]+)', invite['body']).group(1)
        return qa.register(email, 'Jury Test', inviteToken=token)


def pitch_round(admin, event_id, grid=(('Problème', 10), ('Solution', 10), ('Pitch', 10))):
    phases = admin.get(qa.API + f'/phases/event/{event_id}').json()
    pitch = next(p for p in phases if p.get('phaseType') == 'PITCH')
    rounds = admin.get(qa.API + f"/pitch-rounds/phase/{pitch['phaseId']}").json()
    rnd = rounds[0] if rounds else admin.post(qa.API + f"/pitch-rounds/phase/{pitch['phaseId']}",
                                               json={'roundDate': '2026-11-25T10:00:00'}).json()
    criteria = [{'criterion': c, 'maxPoints': m} for c, m in grid]
    assert admin.put(qa.API + f"/pitch-rounds/{rnd['id']}/criteria", json={'criteriaJson': json.dumps(criteria)}).ok
    return rnd


def open_phase1(admin, event_id, questions):
    phase1 = next(p for p in admin.get(qa.API + f'/phases/event/{event_id}').json() if p['phaseOrder'] == 1)
    r = admin.put(qa.API + f"/phases/{phase1['phaseId']}/form-fields", headers={'Content-Type': 'application/json'},
                  data=json.dumps(questions))
    assert r.ok, r.text
    if not phase1['phaseActive']:
        assert admin.put(qa.API + f"/phases/{phase1['phaseId']}/activate").ok
    return phase1


# ── Screens ───────────────────────────────────────────────────────

def create_startup_ui(ui, name, description):
    ui.open('/startup/create')
    ui.type("//input[@placeholder='e.g., QuantumAI Solutions']", name)
    selects = ui.els('//form//select')
    Select(selects[0]).select_by_visible_text('EdTech')
    ui.type("//textarea[starts-with(@placeholder,'Describe your startup')]", description)
    Select(ui.els('//form//select')[1]).select_by_index(1)
    ui.shot('startup_formulaire')
    ui.click("//form//button[@type='submit']")
    ui.wait(20).until(lambda d: 'tab=startup' in d.current_url)
    ui.shot('startup_creee')


def apply_ui(ui, event_title, startup, pitch_text):
    """Events page → Apply → 3 steps → tracking code."""
    ui.open('/events')
    ui.click(f"//h3[normalize-space()={xq(event_title)}]/ancestor::*[.//button][1]//button[contains(., 'Apply')]")
    ui.el("//h2[normalize-space()='Startup Information']")
    choose = ui.els("//label[normalize-space()='Apply with']/following-sibling::select")
    if choose:
        Select(choose[0]).select_by_visible_text(startup)
    sector = Select(ui.el("//label[normalize-space()='Sector *']/following-sibling::select"))
    if not sector.first_selected_option.get_attribute('value'):
        sector.select_by_index(1)
    Select(ui.el("//label[normalize-space()='Your Role *']/following-sibling::select")).select_by_index(1)
    ui.button('Next')
    ui.type("//textarea[starts-with(@placeholder,'Tell us about your project')]", pitch_text)
    ui.button('Skip AI Enhancement')
    ui.click("//input[@type='checkbox' and ancestor::label[contains(., 'original work')]]")
    ui.button('Submit Application')
    ui.el("//h2[normalize-space()='Application Submitted!']", timeout=30)
    code = ui.el("//p[normalize-space()='Application Reference ID']/following-sibling::p").text.strip()
    ui.shot('candidature_code')
    assert re.fullmatch(r'APP-[0-9A-F]{6}', code), code
    return code


def track_ui(ui, code):
    ui.open('/track')
    ui.type("//form//input", code)
    ui.click("//form//button[@type='submit']")
    status = ui.el("//p[contains(@class,'capitalize')]", timeout=20).text.strip()
    ui.shot('suivi_statut')
    return status


def create_event_ui(ui, title):
    ui.open('/admin/events')
    ui.button('Create New Event')
    ui.type("//input[@placeholder='e.g. Quantum AI Hackathon 2026']", title)
    ui.click("//button[normalize-space()='Hackathon']")
    Select(ui.el("//select[option[@value='INCUBATION']]")).select_by_value('INCUBATION')
    ui.type("//textarea[starts-with(@placeholder,'Describe the event')]",
            "Programme d'incubation de startups en IA et informatique quantique.")
    ui.pick_date('Pick start date', dt.date(2026, 11, 1))
    ui.pick_date('Pick end date', dt.date(2026, 11, 30))
    ui.pick_date('Pick deadline', dt.date(2026, 10, 31))
    ui.click("//*[self::button or self::label][normalize-space()='Active']")
    ui.shot('evenement_formulaire')
    ui.click("//button[@type='submit' and contains(., 'Create Event')]")
    ui.accept_alert()
    ui.wait().until(lambda d: d.current_url.rstrip('/').endswith('/admin/events'))
    ui.text_visible(title)
    ui.shot('evenement_cree')


def open_event_ui(ui, title):
    """Admin events list → « Review » on the event's card."""
    ui.open('/admin/events')
    ui.click(f"//*[normalize-space()={xq(title)}]/ancestor::*[.//button[contains(., 'Review')]][1]//button[contains(., 'Review')]")
    ui.el("//button[contains(., 'Add phase')]")


def add_phase_ui(ui, name, start, end):
    ui.click("//button[contains(., 'Add phase')]")
    ui.type("//input[@id='phase-name']", name)
    ui.type("//input[@id='phase-start']", start, clear=False)
    ui.type("//input[@id='phase-end']", end, clear=False)
    ui.click("//div[@role='dialog' or contains(@class,'fixed')]//button[@type='submit']")
    ui.text_visible(name)
    ui.shot('phase_' + name)


def score_pitch_ui(ui, startup, values):
    """In an open round: score `startup` with the given criterion → points."""
    ui.click(f"//h4[normalize-space()={xq(startup)}]/ancestor::*[.//button][1]//button[contains(., 'Score')]")
    ui.el(f"//h3[normalize-space()={xq('Score ' + startup)}]")
    for label, value in values.items():
        ui.click(f"//label[normalize-space()={xq(label)}]/ancestor::div[contains(@class,'space-y-2')][1]//button[normalize-space()='{value}']")
    ui.type("//textarea[@placeholder='Strengths, weaknesses, advice...']", f'Évaluation de {startup}.')
    ui.shot('grille_' + startup)
    ui.click("//button[normalize-space()='Submit score']")
    ui.el(f"//h4[normalize-space()={xq(startup)}]/ancestor::*[.//button][1]//*[contains(., 'Your score: {sum(values.values())}')]", timeout=20)
