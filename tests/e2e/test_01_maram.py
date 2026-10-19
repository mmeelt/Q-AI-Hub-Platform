"""Maram's functional cases (TC-05 to TC-08), run in a real browser against the test copy of the app."""
import datetime as dt
import json, re
import pytest
import qa
from conftest import xq

STATE = qa.HERE / 'state.json'
EVENT = 'Hackathon Q-AI 2026'


def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


def save(**kv):
    s = state(); s.update(kv); STATE.write_text(json.dumps(s, indent=2))


def event_by_title(session, title):
    return next((e for e in session.get(qa.API + '/admin/events').json() if e['title'] == title), None)


@pytest.mark.parametrize('case', ['TC-05'])
def test_TC05_admin_cree_un_evenement(driver, case):
    ui = driver.ui
    # 1. Ouvrir la gestion des événements (compte admin)
    ui.login(qa.ADMIN_EMAIL, qa.ADMIN_PASSWORD, admin=True)
    ui.open('/admin/events')
    ui.button('Create New Event')
    # 2. Le formulaire de création s'affiche
    ui.el("//input[@placeholder='e.g. Quantum AI Hackathon 2026']")
    ui.shot('formulaire')
    # 3. Titre, type INCUBATION, dates 01/11/2026 → 30/11/2026
    ui.type("//input[@placeholder='e.g. Quantum AI Hackathon 2026']", EVENT)
    ui.click("//button[normalize-space()='Hackathon']")
    from selenium.webdriver.support.ui import Select
    Select(ui.el("//select[option[@value='INCUBATION']]")).select_by_value('INCUBATION')
    ui.type("//textarea[starts-with(@placeholder,'Describe the event')]",
            "Programme d'incubation de startups en IA et informatique quantique.")
    ui.pick_date('Pick start date', dt.date(2026, 11, 1))
    ui.pick_date('Pick end date', dt.date(2026, 11, 30))
    ui.pick_date('Pick deadline', dt.date(2026, 10, 31))
    ui.click("//*[self::button or self::label][normalize-space()='Active']")
    ui.shot('formulaire_rempli')
    # 4. Enregistrer (et activer l'événement pour ouvrir les candidatures)
    ui.click("//button[@type='submit' and contains(., 'Create Event')]")
    ui.accept_alert()
    ui.wait().until(lambda d: d.current_url.rstrip('/').endswith('/admin/events'))
    ui.text_visible(EVENT)
    ui.shot('evenement_dans_la_liste')

    created = event_by_title(qa.admin_session(), EVENT)
    assert created, 'événement absent de la liste'
    assert created['eventType'] == 'INCUBATION'
    assert created['startDate'] == '2026-11-01' and created['endDate'] == '2026-11-30'
    assert created['status'] == 'ACTIVE'
    save(eventId=created['eventId'])


STUDENT = 'ali.bensalah@enicar.ucar.tn'


def test_TC06_etudiant_soumet_une_candidature(driver):
    ui = driver.ui
    # Précondition : étudiant inscrit et vérifié, startup QuantumLearn créée, événement actif (TC-05)
    s = qa.register(STUDENT, 'Ali Ben Salah', studentId='ENIC-2026-042')
    mine = s.get(qa.API + '/startups/my').json()
    startup = next((x for x in mine if x.get('projectName') == 'QuantumLearn'), None)
    if not startup:
        r = s.post(qa.API + '/startups', json={'projectName': 'QuantumLearn', 'businessSector': 'EdTech',
                                              'rawDescription': "Plateforme pour apprendre l'informatique quantique aux étudiants."})
        assert r.ok, r.text
        startup = r.json()
    save(startupId=startup['startupId'])

    # 1. Ouvrir l'événement : le détail s'affiche avec le bouton pour postuler
    ui.use_session(s, '/events')
    card = ui.el(f"//h3[normalize-space()={xq(EVENT)}]/ancestor::*[.//button][1]")
    ui.shot('evenement_visible')
    # 2. Cliquer sur « Postuler » : le formulaire de candidature s'affiche
    ui.click(f"//h3[normalize-space()={xq(EVENT)}]/ancestor::*[.//button][1]//button[contains(., 'Apply')]")
    ui.el("//h2[normalize-space()='Startup Information']")
    # 3. Sélectionner la startup QuantumLearn et remplir le dossier
    from selenium.webdriver.support.ui import Select
    Select(ui.el("//label[normalize-space()='Apply with']/following-sibling::select")).select_by_visible_text('QuantumLearn')
    sector = Select(ui.el("//label[normalize-space()='Sector *']/following-sibling::select"))
    if not sector.first_selected_option.get_attribute('value'):
        sector.select_by_index(1)
    Select(ui.el("//label[normalize-space()='Your Role *']/following-sibling::select")).select_by_index(1)
    ui.shot('etape1_projet')
    ui.button('Next')
    ui.type("//textarea[starts-with(@placeholder,'Tell us about your project')]",
            "Plateforme pour apprendre l'informatique quantique aux étudiants.")
    ui.shot('etape2_pitch')
    ui.button('Skip AI Enhancement')
    ui.click("//input[@type='checkbox' and ancestor::label[contains(., 'original work')]]")
    ui.shot('etape3_final')
    # 4. Soumettre : candidature enregistrée, code de suivi APP-XXXXXX affiché
    ui.button('Submit Application')
    ui.el("//h2[normalize-space()='Application Submitted!']", timeout=30)
    code = ui.el("//p[normalize-space()='Application Reference ID']/following-sibling::p").text.strip()
    ui.shot('code_de_suivi')
    assert re.fullmatch(r'APP-[0-9A-F]{6}', code), code
    app = next(a for a in s.get(qa.API + '/applications/my').json() if a['trackingCode'] == code)
    assert app['applicationStatus'] == 'PENDING'
    save(trackingCode=code, applicationId=app['applicationId'])


def test_TC07_suivi_via_code_de_candidature(driver):
    ui = driver.ui
    code = state()['trackingCode']
    # 1. Ouvrir la page de suivi : le champ du code s'affiche
    ui.open('/track')
    field = ui.el("//form//input")
    ui.shot('page_de_suivi')
    # 2. Saisir le code de suivi généré
    ui.type("//form//input", code)
    # 3. Valider : statut de la candidature affiché correctement
    ui.click("//form//button[@type='submit']")
    status = ui.el("//p[contains(@class,'capitalize')]", timeout=20).text.strip()
    ui.shot('statut_affiche')
    assert status.upper() == 'PENDING', status


def test_TC08_admin_cree_une_phase(driver):
    ui = driver.ui
    event_id = state()['eventId']
    admin = qa.admin_session()
    # 1. Ouvrir l'événement « Hackathon Q-AI 2026 »
    ui.use_session(admin, f'/admin/events?reviewEvent={event_id}')
    ui.text_visible(EVENT)
    # 2. Aller à la gestion des phases : la liste des phases s'affiche
    ui.el("//button[contains(., 'Add phase') or contains(., 'Add Phase') or contains(., 'Ajouter')]")
    before = len(admin.get(qa.API + f'/phases/event/{event_id}').json())
    ui.shot('liste_des_phases')
    ui.click("//button[contains(., 'Add phase') or contains(., 'Add Phase') or contains(., 'Ajouter')]")
    # 3. Nom = Phase 2 – Prototype, dates 10/11/2026 → 20/11/2026
    ui.type("//input[@id='phase-name']", 'Phase 2 – Prototype')
    ui.type("//input[@id='phase-start']", '11102026', clear=False)
    ui.type("//input[@id='phase-end']", '11202026', clear=False)
    ui.shot('formulaire_phase')
    # 4. Enregistrer : la phase est créée et visible dans la liste
    ui.click("//div[@role='dialog' or contains(@class,'fixed')]//button[@type='submit']")
    ui.text_visible('Phase 2 – Prototype')
    ui.shot('phase_dans_la_liste')
    phases = admin.get(qa.API + f'/phases/event/{event_id}').json()
    assert len(phases) == before + 1
    created = next(p for p in phases if p['phaseName'] == 'Phase 2 – Prototype')
    assert created['startDate'] == '2026-11-10' and created['endDate'] == '2026-11-20', created
