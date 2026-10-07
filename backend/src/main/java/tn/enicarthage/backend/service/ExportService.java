package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.*;
import tn.enicarthage.backend.repository.*;

import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * CSV exports for the admin "Data & Exports" card. Files open directly in Excel
 * (UTF-8 with BOM, standard quoting) and cells that could run as formulas are neutralised.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExportService {

    private final EventRepository eventRepository;
    private final ApplicationRepository applicationRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final PhaseRepository phaseRepository;
    private final PitchRoundRepository roundRepository;
    private final PitchRoundService pitchRoundService;

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** Applications (startup events) and registrations (simple events), one row per person per event. */
    public String applicationsCsv() {
        Map<String, Event> events = eventsById();
        Map<String, User> users = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity(), (a, b) -> a));
        Map<String, Startup> startups = startupRepository.findAll().stream()
                .collect(Collectors.toMap(Startup::getStartupId, Function.identity(), (a, b) -> a));

        Csv csv = new Csv("Event", "Event type", "Kind", "Name", "Email", "Startup", "Sector", "Stage",
                "Status", "Tracking code", "Submitted at");
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd HH:mm");
        applicationRepository.findAll().stream()
                .sorted(Comparator.comparing((Application a) -> title(events.get(a.getTargetEventId())))
                        .thenComparing(a -> a.getApplicationSubmittedAt(), Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(a -> {
                    Event e = events.get(a.getTargetEventId());
                    User u = a.getApplicantUserId() == null ? null : users.get(a.getApplicantUserId());
                    Startup s = a.getLinkedStartupId() == null ? null : startups.get(a.getLinkedStartupId());
                    csv.row(title(e), e == null ? "" : e.getEventType(), "Application",
                            u == null ? "" : u.getFullName(), u == null ? "" : u.getEmailAddress(),
                            s == null ? "" : s.getProjectName(), s == null ? "" : s.getBusinessSector(),
                            s == null ? "" : s.getStartupStage(),
                            a.getApplicationStatus(), a.getTrackingCode(),
                            a.getApplicationSubmittedAt() == null ? "" : fmt.format(a.getApplicationSubmittedAt()));
                });
        registrationRepository.findAll().stream()
                .sorted(Comparator.comparing((EventRegistration r) -> title(r.getEvent()))
                        .thenComparing(EventRegistration::getRegisteredAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(r -> csv.row(title(r.getEvent()), r.getEvent() == null ? "" : r.getEvent().getEventType(),
                        "Registration", r.getParticipantName(), r.getParticipantEmail(), "", "", "",
                        "Registered", "", r.getRegisteredAt() == null ? "" : r.getRegisteredAt().format(DATE_TIME)));
        return csv.toString();
    }

    /** Every judge's score for every pitch round, with the average (= final score) and final decision. */
    public String juryScoresCsv() {
        Csv csv = new Csv("Event", "Phase", "Round", "Startup", "Founder", "Founder email", "Judge",
                "Judge score", "Judge decision", "Criteria", "Feedback", "Evaluated at",
                "Number of judges", "Final score (average)", "Max score", "Final decision");
        for (Event e : eventRepository.findAll()) {
            for (Phase p : phaseRepository.findByEventIdOrderByPhaseOrderAsc(e.getEventId())) {
                for (PitchRound round : roundRepository.findByPhaseIdOrderByRoundNumberAsc(p.getPhaseId())) {
                    // same numbers as the Pitch Evaluation screen
                    for (Map<String, Object> entry : pitchRoundService.getRoundSummary(round.getId())) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> evals = (List<Map<String, Object>>) entry.get("evaluations");
                        for (Map<String, Object> ev : evals) {
                            Object at = ev.get("evaluatedAt");
                            csv.row(e.getTitle(), p.getPhaseName(),
                                    round.getRoundName() != null ? round.getRoundName() : "Round " + round.getRoundNumber(),
                                    entry.get("startupName"), entry.get("founderName"), entry.get("founderEmail"),
                                    ev.get("evaluatedBy"), ev.get("totalScore"), ev.get("decision"),
                                    criteria((String) ev.get("scoresJson")), ev.get("feedback"),
                                    at instanceof java.time.LocalDateTime t ? t.format(DATE_TIME) : at,
                                    entry.get("judgeCount"), entry.get("averageScore"), entry.get("maxScore"),
                                    entry.get("finalDecision"));
                        }
                    }
                }
            }
        }
        return csv.toString();
    }

    /** All events with their participation figures. */
    public String eventsCsv() {
        Csv csv = new Csv("Title", "Type", "Category", "Status", "Location", "Start date", "End date",
                "Registration deadline", "Max participants", "Applications", "Registrations", "Waiting (Notify me)");
        Map<String, Long> apps = applicationRepository.findAll().stream()
                .filter(a -> a.getTargetEventId() != null)
                .collect(Collectors.groupingBy(Application::getTargetEventId, Collectors.counting()));
        Map<String, Long> regs = registrationRepository.findAll().stream()
                .filter(r -> r.getEvent() != null)
                .collect(Collectors.groupingBy(r -> r.getEvent().getEventId(), Collectors.counting()));
        Map<String, Long> waiting = subscriptionRepository.findAll().stream()
                .filter(s -> s.getNotifiedAt() == null)
                .collect(Collectors.groupingBy(EventSubscription::getEventId, Collectors.counting()));
        eventRepository.findAll().stream()
                .sorted(Comparator.comparing(Event::getStartDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .forEach(e -> csv.row(e.getTitle(), e.getEventType(), e.getCategory(), e.getStatus(), e.getLocation(),
                        e.getStartDate(), e.getEndDate(), e.getApplicationDeadline(), e.getMaxParticipants(),
                        apps.getOrDefault(e.getEventId(), 0L), regs.getOrDefault(e.getEventId(), 0L),
                        waiting.getOrDefault(e.getEventId(), 0L)));
        return csv.toString();
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private Map<String, Event> eventsById() {
        return eventRepository.findAll().stream()
                .collect(Collectors.toMap(Event::getEventId, Function.identity(), (a, b) -> a));
    }

    private static String title(Event e) {
        return e == null ? "(deleted event)" : Objects.toString(e.getTitle(), "");
    }

    /** {"Innovation":4,"Team":5} -> "Innovation: 4; Team: 5" */
    private static String criteria(String json) {
        if (json == null || json.isBlank()) return "";
        try {
            Map<String, Object> m = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(json, new com.fasterxml.jackson.core.type.TypeReference<LinkedHashMap<String, Object>>() {});
            return m.entrySet().stream().map(en -> en.getKey() + ": " + en.getValue()).collect(Collectors.joining("; "));
        } catch (Exception ex) {
            return json;
        }
    }

    /** Small CSV builder: RFC 4180 quoting + protection against formula injection in Excel. */
    static final class Csv {
        private final StringBuilder sb = new StringBuilder("﻿"); // BOM: Excel reads accents correctly

        Csv(String... headers) {
            row((Object[]) headers);
        }

        void row(Object... cells) {
            for (int i = 0; i < cells.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(cell(cells[i]));
            }
            sb.append("\r\n");
        }

        static String cell(Object value) {
            if (value == null) return "";
            String s = value.toString();
            // a cell starting with = + - @ (or tab / CR) would run as a formula in Excel
            if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0 && !(value instanceof Number)) {
                s = "'" + s;
            }
            if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
                s = "\"" + s.replace("\"", "\"\"") + "\"";
            }
            return s;
        }

        @Override
        public String toString() {
            return sb.toString();
        }
    }
}
