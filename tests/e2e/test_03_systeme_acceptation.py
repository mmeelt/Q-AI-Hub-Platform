"""System (SYS-01..03) and acceptance (ACC-01..03) cases, end to end in a real browser.
Each case prepares its own event and accounts, so the cases do not depend on each other."""
import json, time
import qa, flows
from conftest import xq

GRID = {'Problème': 8, 'Solution': 7, 'Pitch': 9}


def test_SYS01_parcours_complet_etudiant(driver):
    ui = driver.ui
    admin = qa.admin_session()
    event = flows.incubation_event(admin, 'Hackathon Q-AI 2026 — Parcours')
    email, startup = 'ali.bensalah.sys@enicar.ucar.tn', 'QuantumLearn SYS'
    # 1. Inscription → vérification OTP → connexion
    ui.register('Ali Ben Salah', 'ENIC-2026-101', email, qa.PASSWORD)
    ui.logout()
    ui.login(email, qa.PASSWORD)
    # The JWT is an HttpOnly cookie: the browser's own API call with it must be authorised
    assert ui.api_status('/users/profile') == 200, 'pas de session (JWT) après la connexion'
    ui.shot('connecte')
    # 2. Création de la startup → candidature à un événement INCUBATION
    flows.create_startup_ui(ui, startup, "Plateforme pour apprendre l'informatique quantique aux étudiants.")
    code = flows.apply_ui(ui, event['title'], startup, "Plateforme pour apprendre l'informatique quantique aux étudiants.")
    # 3. Code de suivi et phases
    ui.open(f"/dashboard?tab=applications&eventId={event['eventId']}")
    ui.text_visible(code)
    ui.text_visible('Your application is pending')
    ui.shot('code_et_etat')
    # (read with the browser's own session: a second login would end it)
    app = next(a for a in ui.api_json('/applications/my') if a['trackingCode'] == code)
    # 4. L'admin accepte la candidature → notification + e-mail
    since = time.time() - 1
    assert admin.put(qa.API + f"/applications/{app['applicationId']}/accept").ok
    qa.wait_mail(email, since, r'accept')
    assert any(n['notificationType'] == 'APPLICATION_ACCEPTED' for n in ui.api_json('/notifications'))
    # 5. Soumission de phase → participation au pitch
    flows.open_phase1(admin, event['eventId'], [{'id': 'q1', 'question': 'Quel problème résolvez-vous ?', 'type': 'textarea', 'required': True}])
    ui.open(f"/dashboard?tab=applications&eventId={event['eventId']}")
    ui.text_visible('Phase 1 is now open')
    ui.button('Submit Answers')
    ui.type('//textarea', "L'informatique quantique est difficile à apprendre sans pratique.")
    ui.button('Submit Answers')
    ui.wait(20).until(lambda d: '/dashboard' in d.current_url)
    ui.shot('phase1_soumise')
    rnd = flows.pitch_round(admin, event['eventId'])
    candidates = admin.get(qa.API + f"/pitch-rounds/{rnd['id']}/candidates").json()
    assert any(c['applicationId'] == app['applicationId'] for c in candidates), 'startup absente du pitch'
    # 6. Évaluation par le jury → consultation du classement
    jury = flows.invite_jury(admin, 'jury.test@enicar.ucar.tn', event['eventId'])
    assert jury.post(qa.API + f"/pitch-rounds/{rnd['id']}/evaluate", json={
        'applicationId': app['applicationId'], 'scoresJson': json.dumps(GRID), 'decision': 'PASSED',
        'feedback': 'Pitch clair.'}).status_code in (200, 201)
    ranking = admin.get(qa.API + f"/pitch-rounds/{rnd['id']}/summary").json()
    assert ranking and ranking[0]['applicationId'] == app['applicationId'] and ranking[0]['averageScore'] == 24
    assert admin.post(qa.API + f"/pitch-rounds/{rnd['id']}/send-results").ok
    ui.open(f"/dashboard?tab=applications&eventId={event['eventId']}")
    ui.text_visible('Pitch Round Results')
    ui.shot('classement_resultat_pitch')


def test_SYS02_amelioration_ia(driver):
    ui = driver.ui
    s = qa.register('sys02.etudiant@enicar.ucar.tn', 'Sara Mansour')
    description = "Plateforme pour apprendre l'informatique quantique aux étudiants."
    ui.use_session(s, '/startup/create')
    # 1. Rédiger la description
    ui.type("//input[@placeholder='e.g., QuantumAI Solutions']", 'QuantumLearn IA')
    ui.type("//textarea[starts-with(@placeholder,'Describe your startup')]", description)
    ui.shot('description_initiale')
    # 2. Cliquer sur « Améliorer avec IA » → 3. description enrichie retournée
    ui.click("//button[normalize-space()='Enhance']")
    ui.el("//button[normalize-space()='Use this']", timeout=60)
    proposal = ui.el("//button[normalize-space()='Use this']/../preceding-sibling::p").text.strip()
    ui.shot('proposition_ia')
    assert proposal and proposal != description
    # 4. Valider la description proposée → enregistrée
    ui.click("//button[normalize-space()='Use this']")
    from selenium.webdriver.support.ui import Select
    Select(ui.els('//form//select')[0]).select_by_visible_text('EdTech')
    Select(ui.els('//form//select')[1]).select_by_index(1)
    ui.click("//form//button[@type='submit']")
    ui.wait(20).until(lambda d: 'tab=startup' in d.current_url)
    ui.shot('startup_enregistree')
    saved = next(x for x in s.get(qa.API + '/startups/my').json() if x['projectName'] == 'QuantumLearn IA')
    assert saved['rawDescription'].strip() == proposal, saved['rawDescription']


def test_SYS03_administration(driver):
    """Everything is done in the admin's browser session; the API is only read at the end
    (an account has one login session at a time: a second login would end the browser's)."""
    ui = driver.ui
    title = 'Hackathon Q-AI 2026 — Administration'
    # 1. Connexion admin → espace d'administration
    ui.login(qa.ADMIN_EMAIL, qa.ADMIN_PASSWORD, admin=True)
    ui.wait().until(lambda d: '/admin' in d.current_url)
    ui.shot('espace_admin')
    # 2. Créer l'événement
    flows.create_event_ui(ui, title)
    # 3. Créer les deux phases
    flows.open_event_ui(ui, title)
    flows.add_phase_ui(ui, 'Phase A – Idéation', '11052026', '11122026')
    flows.add_phase_ui(ui, 'Phase B – Prototype', '11132026', '11202026')
    # 4. Statistiques du dashboard
    ui.open('/admin/dashboard')
    ui.text_visible('Total Users')
    ui.text_visible('Total Applications')
    ui.shot('statistiques_dashboard')
    admin = qa.admin_session()
    event = next(e for e in admin.get(qa.API + '/admin/events').json() if e['title'] == title)
    names = [p['phaseName'] for p in admin.get(qa.API + f"/phases/event/{event['eventId']}").json()]
    assert 'Phase A – Idéation' in names and 'Phase B – Prototype' in names, names


def test_ACC01_etudiant_soumet_et_suit_sa_candidature(driver):
    ui = driver.ui
    admin = qa.admin_session()
    event = flows.incubation_event(admin, 'Hackathon Q-AI 2026 — ACC-01')
    email = 'acc01.etudiant@enicar.ucar.tn'
    s = qa.register(email, 'Amine Gharbi')
    s.post(qa.API + '/startups', json={'projectName': 'QuantumLearn', 'businessSector': 'EdTech', 'rawDescription': 'QuantumLearn'})
    # 1. Se connecter avec le compte étudiant de test
    ui.login(email, qa.PASSWORD)
    ui.shot('espace_etudiant')
    # 2. Soumettre une candidature avec la startup QuantumLearn
    code = flows.apply_ui(ui, event['title'], 'QuantumLearn', "Plateforme pour apprendre l'informatique quantique aux étudiants.")
    # 3. Consulter l'état avec le code de suivi
    assert flows.track_ui(ui, code).upper() == 'PENDING'


def test_ACC02_admin_cree_un_evenement_et_gere_ses_phases(driver):
    ui = driver.ui
    title = 'Hackathon Q-AI 2026 — ACC-02'
    # 1. Se connecter avec le compte admin
    ui.login(qa.ADMIN_EMAIL, qa.ADMIN_PASSWORD, admin=True)
    ui.wait().until(lambda d: '/admin' in d.current_url)
    # 2. Créer un nouvel événement
    flows.create_event_ui(ui, title)
    # 3. Créer et gérer les deux phases (création, puis ouverture de la phase A)
    flows.open_event_ui(ui, title)
    flows.add_phase_ui(ui, 'Phase A – Idéation', '11052026', '11122026')
    flows.add_phase_ui(ui, 'Phase B – Prototype', '11132026', '11202026')
    ui.click("//h4[normalize-space()='Phase A – Idéation']/ancestor::div[contains(@class,'rounded-xl')][1]//button[contains(., 'Activate')]")
    ui.text_visible('1 active phase')
    ui.shot('phase_A_ouverte')
    admin = qa.admin_session()
    event = next(e for e in admin.get(qa.API + '/admin/events').json() if e['title'] == title)
    phases = {p['phaseName']: p for p in admin.get(qa.API + f"/phases/event/{event['eventId']}").json()}
    assert {'Phase A – Idéation', 'Phase B – Prototype'} <= set(phases), list(phases)
    assert phases['Phase A – Idéation']['phaseActive'] and not phases['Phase B – Prototype']['phaseActive']


def test_ACC03_jury_evalue_candidatures_et_pitchs(driver):
    ui = driver.ui
    admin = qa.admin_session()
    event = flows.incubation_event(admin, 'Hackathon Q-AI 2026 — ACC-03')
    startups = {'QuantumLearn A': 'acc03.a@enicar.ucar.tn', 'QuantumLearn B': 'acc03.b@enicar.ucar.tn',
                'QuantumLearn C': 'acc03.c@enicar.ucar.tn'}
    apps = {name: flows.student_with_application(mail, name, name, event['eventId'])[1] for name, mail in startups.items()}
    jury_email = 'jury.acc03@enicar.ucar.tn'
    flows.invite_jury(admin, jury_email, event['eventId'])
    # 1. Se connecter avec le compte jury → espace jury
    ui.login(jury_email, qa.PASSWORD)
    ui.open(f"/expert/event/{event['eventId']}")
    ui.text_visible('Participating Startups')
    ui.shot('espace_jury')
    # 2. Évaluer les candidatures des 3 startups (note /20 + recommandation)
    for (name, app), grade in zip(apps.items(), (16, 12, 14)):
        ui.open(f"/expert/event/{event['eventId']}?applicant={app['applicationId']}")
        ui.type("//input[@type='number' and @max='20']", str(grade))
        ui.click("//button[contains(., 'Recommend accept')]")
        ui.type("//textarea[starts-with(@placeholder,'Comment for the admin')]", f'Dossier {name}.')
        ui.click("//button[contains(., 'Send my grade')]")
        ui.text_visible('Your grade was sent to the admin')
        ui.shot('note_candidature_' + name)
    for app in apps.values():
        reviews = admin.get(qa.API + f"/applications/{app['applicationId']}/reviews").json()
        assert reviews['reviews'] and reviews['averageScore'] in (16, 12, 14)
        assert admin.put(qa.API + f"/applications/{app['applicationId']}/accept").ok
    # 3. Évaluer les pitchs de ces startups
    rnd = flows.pitch_round(admin, event['eventId'])
    ui.open(f"/expert/event/{event['eventId']}?tab=pitch")
    ui.button('Score startups')
    for (name, _), pts in zip(apps.items(), ({'Problème': 8, 'Solution': 7, 'Pitch': 9},
                                            {'Problème': 5, 'Solution': 6, 'Pitch': 4},
                                            {'Problème': 7, 'Solution': 7, 'Pitch': 7})):
        flows.score_pitch_ui(ui, name, pts)
    ui.shot('pitchs_evalues')
    # 4. Classement consolidé (vue de l'administration : moyenne des jurys, triée)
    ranking = admin.get(qa.API + f"/pitch-rounds/{rnd['id']}/summary").json()
    order = [next(n for n, a in apps.items() if a['applicationId'] == e['applicationId']) for e in ranking]
    assert order == ['QuantumLearn A', 'QuantumLearn C', 'QuantumLearn B'], order
    assert [e['averageScore'] for e in ranking] == [24, 21, 15]
    # The jury's own screen: the pitch view offers no ranking to experts
    assert not ui.els("//button[contains(., 'All judges & results')]")
