package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.PitchEvaluationRepository;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EventRepository eventRepository;
    private final PhaseRepository phaseRepository;
    private final PhaseSubmissionRepository submissionRepository;
    private final ApplicationRepository applicationRepository;
    private final PitchEvaluationRepository pitchEvaluationRepository;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;


    // ── GET SYSTEM STATISTICS ─────────────────────────────────────

    public Map<String, Object> getSystemStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // metricTotalUsers
        stats.put("metricTotalUsers", userRepository.count());

        // metricTotalEvents
        stats.put("metricTotalEvents", eventRepository.count());

        // metricActiveStartups — startups not in DRAFT status
        stats.put("metricActiveStartups",
            startupRepository.findByStartupStatus(Startup.StartupStatus.ACTIVE).size());

        stats.put("metricPitchesEvaluated", pitchEvaluationRepository.count());

        stats.put("totalApplications", applicationRepository.count());

        // metricTotalFunding — sum across all startups
        stats.put("metricTotalFunding",
            startupRepository.findAll().stream()
                .filter(s -> s.getTotalFundingRaised() != null)
                .mapToDouble(s -> s.getTotalFundingRaised().doubleValue())
                .sum());


        // chartSectorFocusData — events grouped by category
        Map<String, Long> sectorFocus = eventRepository.findAll().stream()
                .filter(e -> e.getCategory() != null)
                .collect(Collectors.groupingBy(Event::getCategory, Collectors.counting()));
        stats.put("chartSectorFocusData", sectorFocus);

        // chartGrowthByYear — events grouped by start year
        Map<String, Long> growthByYear = eventRepository.findAll().stream()
                .filter(e -> e.getStartDate() != null)
                .collect(Collectors.groupingBy(
                        e -> String.valueOf(e.getStartDate().getYear()),
                        Collectors.counting()
                ));
        stats.put("chartGrowthByYear", growthByYear);

        // feedRecentActivity — last 5 submissions (optimized query)
        List<Map<String, Object>> recentActivity = submissionRepository.findTop5ByOrderBySubmittedAtDesc().stream()
                .map(s -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("applicationId", s.getSourceApplicationId());
                    item.put("status", s.getStatus());
                    item.put("score", s.getEvaluationScore());
                    item.put("submittedAt", s.getSubmittedAt());
                    return item;
                })
                .collect(Collectors.toList());
        stats.put("feedRecentActivity", recentActivity);


        // dataLastRefreshedAt
        stats.put("dataLastRefreshedAt", LocalDateTime.now());

        return stats;
    }

    // ── GET EVENT METRICS ─────────────────────────────────────────

    public Map<String, Object> getEventMetrics(String eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Event not found: " + eventId));

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("eventId",           event.getEventId());
        metrics.put("title",             event.getTitle());
        metrics.put("status",            event.getStatus());
        metrics.put("category",          event.getCategory());
        metrics.put("maxParticipants",   event.getMaxParticipants());
        metrics.put("currentRegistered", event.getCurrentRegisteredCount());
        metrics.put("isOpen",            event.isOpenForApplications());
        metrics.put("isFull",            event.isFull());
        metrics.put("totalPhases",       phaseRepository.findByEventIdOrderByPhaseOrderAsc(eventId).size());
        metrics.put("activePhase",       event.getActivePhase() != null ? event.getActivePhase().getPhaseName() : null);

        metrics.put("totalApplications",
            applicationRepository.findByTargetEventId(eventId).size());
 

        return metrics;
    }

    // ── GET STARTUP METRICS ───────────────────────────────────────

    public Map<String, Object> getStartupMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // Active startups
        metrics.put("metricActiveStartups",
            startupRepository.findByStartupStatus(Startup.StartupStatus.ACTIVE).size());

        // Total funding raised across all startups
        double totalFunding = startupRepository.findAll().stream()
            .filter(s -> s.getTotalFundingRaised() != null)
            .mapToDouble(s -> s.getTotalFundingRaised().doubleValue())
            .sum();
        metrics.put("metricTotalFunding", totalFunding);

        // Total pitch evaluations
        metrics.put("metricPitchesEvaluated", pitchEvaluationRepository.count());

        // Average phase submission score
        List<PhaseSubmission> allSubmissions = submissionRepository.findAll();
        double avgScore = allSubmissions.stream()
                .filter(s -> s.getEvaluationScore() != null)
                .mapToDouble(PhaseSubmission::getEvaluationScore)
                .average()
                .orElse(0.0);
        metrics.put("averageSubmissionScore", Math.round(avgScore * 100.0) / 100.0);

        return metrics;
    }

    // ── EXPORT REPORT ─────────────────────────────────────────────

    public Map<String, Object> exportReport(String format) {
        Map<String, Object> report = new HashMap<>();
        report.put("format",      format);
        report.put("generatedAt", LocalDateTime.now());
        report.put("data",        getSystemStatistics());
        // TODO: generate real PDF/CSV file — for now returns data as JSON
        return report;
    }

    // ── REFRESH DASHBOARD ─────────────────────────────────────────

    public Map<String, Object> refreshDashboardData() {
        Map<String, Object> data = new HashMap<>();
        data.put("systemStats",    getSystemStatistics());
        data.put("startupMetrics", getStartupMetrics());
        data.put("lastRefreshed",  LocalDateTime.now());
        return data;
    }
}
