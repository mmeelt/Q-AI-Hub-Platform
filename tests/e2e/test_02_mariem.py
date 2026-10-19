"""Mariem's functional cases (TC-12, TC-09, TC-10, TC-11), run in a real browser against the test copy of the app.
TC-12 runs first: the acceptance is what opens Phase 1 (TC-09) and the pitch (TC-10) to the startup."""
import json, re, time
import qa
from conftest import xq
from test_01_maram import state, save, STUDENT, EVENT

JURY = 'jury.test@enicar.ucar.tn'
PDF_NAME = 'dossier_soumission.pdf'


def student():
    return qa.user_session(STUDENT)


def test_TC12_candidature_acceptee(driver):
    ui = driver.ui
    st = state()
    admin = qa.admin_session()
    since = time.time() - 1
    # 1. Ouvrir la candidature (statut « En attente »)
    ui.use_session(admin, f"/admin/events?reviewEvent={st['eventId']}&applicant={st['applicationId']}")
    ui.el("//button[normalize-space()='Accept Startup']")
    ui.text_visible('QuantumLearn')
    ui.shot('candidature_en_attente')
    # 2. Cliquer sur « Accepter » : le statut passe à « Acceptée »
    ui.button('Accept Startup')
    ui.text_visible('Application accepted')
    ui.shot('acceptee')
    app = next(a for a in admin.get(qa.API + f"/applications/event/{st['eventId']}").json()
               if a['applicationId'] == st['applicationId'])
    assert app['applicationStatus'] == 'ACCEPTED', app['applicationStatus']
    # 3. Notification interne du candidat
    s = student()
    notes = s.get(qa.API + '/notifications').json()
    assert any(n.get('notificationType') == 'APPLICATION_ACCEPTED' for n in notes), notes
    ui.use_session(s, '/dashboard?tab=notifications')
    ui.text_visible('Application Accepted')
    ui.shot('notification_du_candidat')
    # 4. E-mail d'acceptation reçu par le candidat
    mail = qa.wait_mail(STUDENT, since, r'accept')
    (qa.HERE / 'TC12_email_acceptation.txt').write_text(f"To: {STUDENT}\nSubject: {mail['subject']}\n\n{mail['body']}", encoding='utf-8')
    assert st['trackingCode'] in mail['body'] or 'QuantumLearn' in mail['body'], mail['subject']


def _make_pdf(path, size=1_000_000):
    """A valid PDF of about 1 MB (a real PDF header so the server's content check accepts it)."""
    head = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" \
           b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n"
    pad = b"% dossier de soumission QuantumLearn\n" * ((size - len(head)) // 38)
    path.write_bytes(head + pad + b"trailer<</Root 1 0 R>>\n%%EOF\n")
    return path


def test_TC09_depot_d_un_fichier_de_soumission(driver):
    ui = driver.ui
    st = state()
    admin = qa.admin_session()
    phase1 = next(p for p in admin.get(qa.API + f"/phases/event/{st['eventId']}").json() if p['phaseOrder'] == 1)
    # Précondition : Phase 1 ouverte aux soumissions, avec une question de dépôt de fichier PDF
    r = admin.put(qa.API + f"/phases/{phase1['phaseId']}/form-fields", headers={'Content-Type': 'application/json'},
                  data=json.dumps([{'id': 'q_dossier', 'question': 'Dossier de soumission (PDF)', 'type': 'pdf', 'required': True}]))
    assert r.ok, r.text
    if not phase1['phaseActive']:
        assert admin.put(qa.API + f"/phases/{phase1['phaseId']}/activate").ok
    pdf = _make_pdf(qa.HERE / PDF_NAME)
    s = student()
    # 1. Ouvrir la phase en cours : la zone de dépôt s'affiche
    ui.use_session(s, f"/dashboard?tab=applications&eventId={st['eventId']}")
    ui.text_visible('Phase 1 is now open')
    ui.shot('phase1_ouverte')
    ui.button('Submit Answers')
    upload = ui.el("//input[@type='file']")
    ui.shot('zone_de_depot')
    # 2. Sélectionner le fichier dossier_soumission.pdf (≈ 1 Mo)
    upload.send_keys(str(pdf))
    # 3. Envoyer le fichier : validé et enregistré
    ui.text_visible('File uploaded', timeout=30)
    ui.shot('fichier_valide')
    ui.button('Submit Answers')
    ui.wait(20).until(lambda d: '/dashboard' in d.current_url)
    ui.shot('soumission_enregistree')
    subs = s.get(qa.API + f"/submissions/application/{st['applicationId']}").json()
    sub = next(x for x in subs if x.get('phaseOrder') == 1 or x.get('phaseId') == phase1['phaseId'])
    answers = json.loads(sub.get('answersJson') or '{}') if isinstance(sub.get('answersJson'), str) else sub.get('answersJson', {})
    url = answers.get('q_dossier', '')
    assert url.startswith('/uploads/questionnaire/') and url.endswith('.pdf'), sub
    stored = qa.HERE / 'uploads' / url[len('/uploads/'):]
    assert stored.exists() and stored.stat().st_size == pdf.stat().st_size, stored
    save(phase1Id=phase1['phaseId'])


def test_TC10_jury_evalue_un_pitch(driver):
    ui = driver.ui
    st = state()
    admin = qa.admin_session()
    # Précondition : membre du jury invité sur l'événement et connecté ; session de pitch planifiée
    try:
        jury = qa.user_session(JURY)  # already created by an earlier run
    except Exception:
        since = time.time() - 1
        assert admin.post(qa.API + '/admin/invite-expert', json={'email': JURY, 'expertRole': 'Judge', 'eventId': st['eventId']}).ok
        invite = qa.wait_mail(JURY, since, r'invite=')
        token = re.search(r'invite=([\w-]+)', invite['body']).group(1)
        jury = qa.register(JURY, 'Jury Test', inviteToken=token)
    phases = admin.get(qa.API + f"/phases/event/{st['eventId']}").json()
    pitch = next((p for p in phases if p.get('phaseType') == 'PITCH'), None)
    if not pitch:
        r = admin.post(qa.API + f"/phases/event/{st['eventId']}", json={'phaseName': 'Pitch final', 'phaseType': 'PITCH'})
        assert r.ok, r.text
        pitch = r.json()
    rounds = admin.get(qa.API + f"/pitch-rounds/phase/{pitch['phaseId']}").json()
    rnd = rounds[0] if rounds else admin.post(qa.API + f"/pitch-rounds/phase/{pitch['phaseId']}",
                                               json={'roundDate': '2026-11-25T10:00:00'}).json()
    grid = [{'criterion': 'Problème', 'maxPoints': 10}, {'criterion': 'Solution', 'maxPoints': 10},
            {'criterion': 'Pitch', 'maxPoints': 10}]
    assert admin.put(qa.API + f"/pitch-rounds/{rnd['id']}/criteria", json={'criteriaJson': json.dumps(grid)}).ok

    # 1. Ouvrir la session de pitch de QuantumLearn : la grille d'évaluation s'affiche
    ui.use_session(jury, f"/expert/event/{st['eventId']}?tab=pitch")
    ui.click("//button[contains(., 'Score') or contains(., 'Evaluate') or contains(., 'Open')][ancestor::*[contains(., 'Round 1') or contains(., 'Round')]]")
    ui.text_visible('QuantumLearn')
    ui.shot('session_de_pitch')
    ui.click("//h4[normalize-space()='QuantumLearn']/ancestor::*[.//button][1]//button[contains(., 'Score')]")
    ui.el("//h3[starts-with(normalize-space(), 'Score QuantumLearn')]")
    ui.shot('grille_d_evaluation')
    # 2. Saisir les notes 8, 7 et 9
    for label, value in (('Problème', 8), ('Solution', 7), ('Pitch', 9)):
        ui.click(f"//label[normalize-space()={xq(label)}]/ancestor::div[contains(@class,'space-y-2')][1]//button[normalize-space()='{value}']")
    ui.type("//textarea[@placeholder='Strengths, weaknesses, advice...']", 'Problème clair, démonstration convaincante.')
    ui.el("//p[normalize-space()='Total']/following-sibling::p[starts-with(normalize-space(), '24')]")
    ui.shot('notes_saisies')
    # 3. Enregistrer l'évaluation
    ui.click("//button[normalize-space()='Submit score']")
    ui.text_visible('Your score: 24', timeout=20)
    ui.shot('evaluation_enregistree')
    results = jury.get(qa.API + f"/pitch-rounds/{rnd['id']}/results").json()
    mine = next(r for r in results if r['applicationId'] == st['applicationId'])
    assert mine['totalScore'] == 24 and json.loads(mine['scoresJson']) == {'Problème': 8, 'Solution': 7, 'Pitch': 9}, mine
    save(roundId=rnd['id'])


DESCRIPTION = "Plateforme pour apprendre l'informatique quantique aux étudiants."


def test_TC11_amelioration_de_description_via_gemini(driver):
    ui = driver.ui
    s = student()
    # 1. Ouvrir la création d'une startup : le formulaire s'affiche
    ui.use_session(s, '/startup/create')
    area = ui.el("//textarea[starts-with(@placeholder,'Describe your startup')]")
    ui.shot('formulaire_creation_startup')
    # 2. Rédiger la description
    ui.type("//textarea[starts-with(@placeholder,'Describe your startup')]", DESCRIPTION)
    # 3. Cliquer sur « Améliorer avec IA » : description enrichie renvoyée et affichée
    ui.click("//button[normalize-space()='Enhance']")
    ui.el("//button[normalize-space()='Use this']", timeout=60)
    proposal = ui.el("//button[normalize-space()='Use this']/../preceding-sibling::p").text
    ui.shot('description_enrichie')
    (qa.HERE / 'TC11_reponse_gemini.txt').write_text(proposal, encoding='utf-8')
    assert proposal.strip() and proposal.strip() != DESCRIPTION and len(proposal) > len(DESCRIPTION) / 2, proposal
