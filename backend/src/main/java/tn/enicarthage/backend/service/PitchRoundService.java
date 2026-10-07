package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.entity.PitchEvaluation;
import tn.enicarthage.backend.entity.PitchRound;
import tn.enicarthage.backend.entity.PitchRoundResult;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.PhaseRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;
import tn.enicarthage.backend.repository.PitchEvaluationRepository;
import tn.enicarthage.backend.repository.PitchRoundRepository;
import tn.enicarthage.backend.repository.PitchRoundResultRepository;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class PitchRoundService {

    private final PitchRoundRepository pitchRoundRepository;
    private final PitchRoundResultRepository resultRepository;
    private final PhaseRepository phaseRepository;
    private final PhaseSubmissionRepository phaseSubmissionRepository;
    private final PitchEvaluationRepository pitchEvaluationRepository;
    private final ApplicationRepository applicationRepository;
    private final StartupRepository startupRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final GeminiService geminiService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    // ── Default criteria per round ─────────────────────────────────

    private String getDefaultCriteria(int roundNumber) {
        return switch (roundNumber) {
            case 1 -> "[" +
                    "{\"criterion\":\"Problem\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Solution\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Target\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Motivation\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Pitch\",\"maxPoints\":5}" +
                    "]";
            case 2 -> "[" +
                    "{\"criterion\":\"Innovation\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Problem-Solution Fit\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Market\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Business Model\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Feasibility\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Validation\",\"maxPoints\":5}" +
                    "]";
            case 3 -> "[" +
                    "{\"criterion\":\"Value Proposition\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Solution & Technology\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Market Positioning\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Financial Model\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Technical Implementation\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Roadmap\",\"maxPoints\":5}," +
                    "{\"criterion\":\"Team\",\"maxPoints\":5}" +
                    "]";
            default -> "[{\"criterion\":\"Overall\",\"maxPoints\":5}]";
        };
    }

    private String getDefaultRoundName(int roundNumber) {
        return switch (roundNumber) {
            case 1 -> "Ideation Round";
            case 2 -> "Screening Round";
            case 3 -> "Final Round";
            default -> "Round " + roundNumber;
        };
    }

    // ── CREATE ────────────────────────────────────────────────────

    @Transactional
    public PitchRound addRound(String phaseId, LocalDateTime roundDate) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> new EntityNotFoundException("Phase not found: " + phaseId));

        List<PitchRound> existingRounds = pitchRoundRepository.findByPhaseIdOrderByRoundNumberAsc(phaseId);
        int nextRoundNumber = existingRounds.size() + 1;

        PitchRound round = PitchRound.builder()
                .phase(phase)
                .roundNumber(nextRoundNumber)
                .roundName(getDefaultRoundName(nextRoundNumber))
                .roundDate(roundDate)
                .criteriaJson(getDefaultCriteria(nextRoundNumber))
                .build();

        return pitchRoundRepository.save(round);
    }

    // ── READ ──────────────────────────────────────────────────────

    public PitchRound getRoundById(Long id) {
        return pitchRoundRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("PitchRound not found: " + id));
    }

    public List<PitchRound> getRoundsByPhase(String phaseId) {
        return pitchRoundRepository.findByPhaseIdOrderByRoundNumberAsc(phaseId);
    }

    /**
     * Returns all ACCEPTED applications for the event associated with this phase.
     * Each entry carries applicationId, startupName, founderName, founderEmail.
     */
    public List<Map<String, Object>> getEligibleApplicants(String phaseId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> new EntityNotFoundException("Phase not found: " + phaseId));

        List<Application> accepted = applicationRepository
                .findByTargetEventIdAndApplicationStatus(phase.getEventId(), "ACCEPTED");

        return accepted.stream().map(this::applicantInfo).collect(Collectors.toList());
    }

    /**
     * Startups that can be judged in a given round:
     * round 1 → accepted applications that passed Phase 2 (all accepted ones if Phase 2 has no submissions);
     * round n → startups whose final (averaged) decision in round n-1 is PASSED.
     */
    public List<Map<String, Object>> getRoundCandidates(Long roundId) {
        PitchRound round = getRoundById(roundId);
        Phase phase = round.getPhase();
        List<Map<String, Object>> accepted = getEligibleApplicants(phase.getPhaseId());

        Set<String> allowed = null;
        int roundNumber = round.getRoundNumber() == null ? 1 : round.getRoundNumber();
        if (roundNumber <= 1) {
            Optional<Phase> phase2 = phaseRepository.findByEventIdAndPhaseOrder(phase.getEventId(), 2);
            if (phase2.isPresent() && !phase2.get().getPhaseId().equals(phase.getPhaseId())) {
                List<PhaseSubmission> subs = phaseSubmissionRepository.findByPhaseId(phase2.get().getPhaseId());
                if (!subs.isEmpty()) {
                    allowed = subs.stream()
                            .filter(sub -> sub.getOutcome() == PhaseSubmission.DecisionStatus.ACCEPTED)
                            .map(PhaseSubmission::getSourceApplicationId)
                            .collect(Collectors.toSet());
                }
            }
        } else {
            Optional<PitchRound> previous = pitchRoundRepository
                    .findByPhaseIdOrderByRoundNumberAsc(phase.getPhaseId()).stream()
                    .filter(r -> r.getRoundNumber() != null && r.getRoundNumber() == roundNumber - 1)
                    .findFirst();
            if (previous.isPresent()) {
                allowed = getPassedByRound(previous.get().getId()).stream()
                        .map(PitchRoundResult::getApplicationId)
                        .collect(Collectors.toSet());
            }
        }

        if (allowed == null) return accepted;
        Set<String> finalAllowed = allowed;
        return accepted.stream()
                .filter(info -> finalAllowed.contains((String) info.get("applicationId")))
                .collect(Collectors.toList());
    }

    /** applicationId, startupName, founderName, founderEmail for an application. */
    private Map<String, Object> applicantInfo(Application app) {
        Map<String, Object> info = new HashMap<>();
        info.put("applicationId", app.getApplicationId());

        String startupName = "Unknown Startup";
        if (app.getLinkedStartupId() != null) {
            startupName = startupRepository.findById(app.getLinkedStartupId())
                    .map(Startup::getProjectName)
                    .orElse("Unknown Startup");
        }
        info.put("startupName", startupName);

        String founderEmail = "";
        String founderName = "Founder";
        if (app.getApplicantUserId() != null) {
            Optional<User> userOpt = userRepository.findById(app.getApplicantUserId());
            founderEmail = userOpt.map(User::getEmailAddress).orElse("");
            founderName = userOpt.map(User::getFullName).orElse("Founder");
        }
        info.put("founderName", founderName);
        info.put("founderEmail", founderEmail);
        return info;
    }

    // ── UPDATE CRITERIA ───────────────────────────────────────────

    @Transactional
    public PitchRound updateCriteria(Long roundId, String criteriaJson) {
        PitchRound round = getRoundById(roundId);
        round.setCriteriaJson(criteriaJson);
        return pitchRoundRepository.save(round);
    }

    // ── DELETE ────────────────────────────────────────────────────

    @Transactional
    public void deleteRound(Long id) {
        pitchRoundRepository.deleteById(id);
    }

    // ── EVALUATE ─── send email + update PitchEvaluation ─────────

    public String enhanceFeedback(String roundName, String scoresJson, String feedback) {
        try {
            String prompt = "You are an expert startup incubator mentor. A startup just finished "
                    + roundName + ". " +
                    "Jury Feedback: \"" + feedback + "\". " +
                    "Criteria Scores: " + scoresJson + ". " +
                    "Based on this, write a professional, encouraging 2-sentence analysis for the founder. " +
                    "Do not use markdown. Do not mention that you are an AI or an automated system.";
            return geminiService.getAiFeedback(prompt);
        } catch (Exception e) {
            log.error("Failed to enhance pitch feedback: {}", e.getMessage());
            return "Based on your performance, we encourage you to keep refining your strategy and communication.";
        }
    }

    // ── EVALUATE (one score per judge) ────────────────────────────

    /**
     * Saves the score of one judge for one startup in one round.
     * Each judge has a single, editable evaluation per startup and round (re-submitting updates it).
     * Nothing is sent to the startup here: the admin sends the averaged results with sendBulkResults.
     */
    @Transactional
    public PitchRoundResult evaluateParticipant(
            Long roundId,
            String applicationId,
            String scoresJson,
            PitchRoundResult.RoundDecision decision,
            String feedback,
            String judgeEmail,
            String manualAiFeedback) {

        PitchRound round = getRoundById(roundId);
        if (judgeEmail == null || judgeEmail.isBlank()) {
            throw new IllegalStateException("Unable to identify the judge");
        }
        if (decision == null) {
            throw new IllegalArgumentException("A decision (PASSED or REJECTED) is required");
        }
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + applicationId));
        if (!Objects.equals(app.getTargetEventId(), round.getPhase().getEventId())) {
            throw new IllegalArgumentException("This startup is not part of this event");
        }

        double totalScore;
        try {
            Map<String, Double> scores = objectMapper.readValue(scoresJson, new TypeReference<Map<String, Double>>() {
            });
            if (scores.values().stream().anyMatch(v -> v == null || v < 0)) {
                throw new IllegalArgumentException("Scores must be positive numbers");
            }
            totalScore = scores.values().stream().mapToDouble(Double::doubleValue).sum();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid scores");
        }
        double maxScore = computeRoundMaxScore(round);
        if (maxScore > 0 && totalScore > maxScore) {
            throw new IllegalArgumentException("Total score " + totalScore + " exceeds the round maximum of " + maxScore);
        }

        PitchRoundResult result = resultRepository
                .findByPitchRoundIdAndApplicationIdAndEvaluatedByIgnoreCase(roundId, applicationId, judgeEmail)
                .orElseGet(() -> PitchRoundResult.builder()
                        .pitchRound(round)
                        .applicationId(applicationId)
                        .evaluatedBy(judgeEmail)
                        .build());
        result.setScoresJson(scoresJson);
        result.setTotalScore(totalScore);
        result.setDecision(decision);
        result.setFeedback(feedback);
        result.setAiFeedback(manualAiFeedback == null ? "" : manualAiFeedback);
        result.setEvaluatedAt(LocalDateTime.now());
        resultRepository.save(result);

        updateCumulativePitchEvaluation(applicationId, round);
        return result;
    }

    // ── SUMMARY (all judges + average) ────────────────────────────

    /**
     * One entry per evaluated startup: every judge's evaluation, the average score
     * (= final score) and the final decision derived from that average.
     */
    public List<Map<String, Object>> getRoundSummary(Long roundId) {
        PitchRound round = getRoundById(roundId);
        double maxScore = computeRoundMaxScore(round);
        List<Map<String, Object>> summary = new ArrayList<>();
        groupResultsByApplication(roundId).forEach((applicationId, results) -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            Optional<Application> app = applicationRepository.findById(applicationId);
            if (app.isPresent()) {
                entry.putAll(applicantInfo(app.get()));
            } else {
                entry.put("applicationId", applicationId);
                entry.put("startupName", "Unknown Startup");
            }
            double average = averageScore(results);
            long passedVotes = results.stream()
                    .filter(r -> r.getDecision() == PitchRoundResult.RoundDecision.PASSED).count();
            entry.put("judgeCount", results.size());
            entry.put("averageScore", average);
            entry.put("maxScore", maxScore);
            entry.put("passedVotes", passedVotes);
            entry.put("rejectedVotes", results.size() - passedVotes);
            entry.put("finalDecision", finalDecision(average, maxScore));
            entry.put("evaluations", results.stream().map(r -> {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("id", r.getId());
                e.put("evaluatedBy", r.getEvaluatedBy());
                e.put("totalScore", r.getTotalScore());
                e.put("decision", r.getDecision());
                e.put("scoresJson", r.getScoresJson());
                e.put("feedback", r.getFeedback());
                e.put("evaluatedAt", r.getEvaluatedAt());
                return e;
            }).collect(Collectors.toList()));
            summary.add(entry);
        });
        summary.sort(Comparator.comparingDouble((Map<String, Object> e) -> (Double) e.get("averageScore")).reversed());
        return summary;
    }

    private Map<String, List<PitchRoundResult>> groupResultsByApplication(Long roundId) {
        return resultRepository.findByPitchRoundId(roundId).stream()
                .sorted(Comparator.comparing(PitchRoundResult::getId))
                .collect(Collectors.groupingBy(PitchRoundResult::getApplicationId, LinkedHashMap::new, Collectors.toList()));
    }

    private double averageScore(List<PitchRoundResult> results) {
        double avg = results.stream()
                .mapToDouble(r -> r.getTotalScore() != null ? r.getTotalScore() : 0.0)
                .average().orElse(0.0);
        return Math.round(avg * 100.0) / 100.0;
    }

    /** The final score is the judges' average; it passes at 60% of the round's maximum. */
    private PitchRoundResult.RoundDecision finalDecision(double average, double maxScore) {
        double threshold = (maxScore > 0 ? maxScore : 25.0) * 0.6;
        return average >= threshold ? PitchRoundResult.RoundDecision.PASSED : PitchRoundResult.RoundDecision.REJECTED;
    }

    // ── SEND RESULTS (bulk, averaged) ─────────────────────────────

    @Transactional
    public Map<String, Object> sendBulkResults(Long roundId) {
        PitchRound round = getRoundById(roundId);
        double maxScore = computeRoundMaxScore(round);

        int sent = 0;
        int failed = 0;
        Map<String, List<PitchRoundResult>> grouped = groupResultsByApplication(roundId);
        for (Map.Entry<String, List<PitchRoundResult>> entry : grouped.entrySet()) {
            String applicationId = entry.getKey();
            List<PitchRoundResult> results = entry.getValue();
            double average = averageScore(results);
            PitchRoundResult.RoundDecision decision = finalDecision(average, maxScore);
            String feedback = combinedFeedback(results);
            String aiFeedback = results.stream()
                    .map(PitchRoundResult::getAiFeedback)
                    .filter(f -> f != null && !f.isBlank())
                    .findFirst().orElse("");
            try {
                sendResultEmailToStartup(applicationId, round.getRoundName(), average, decision.name(),
                        feedback, aiFeedback);
                applicationRepository.findById(applicationId).ifPresent(app -> notificationService.createNotification(
                        app.getApplicantUserId(),
                        decision == PitchRoundResult.RoundDecision.PASSED
                                ? "Congratulations! Passed " + round.getRoundName()
                                : "Pitch Result Available",
                        "Your results for " + round.getRoundName() + " are available. Average jury score: "
                                + average + (maxScore > 0 ? " / " + maxScore : "") + ".",
                        "PITCH_RESULT"));
                sent++;
            } catch (Exception e) {
                log.error("Failed to send result for applicationId {}: {}", applicationId, e.getMessage());
                failed++;
            }
        }

        round.setResultsSentAt(LocalDateTime.now());
        pitchRoundRepository.save(round);

        Map<String, Object> summary = new HashMap<>();
        summary.put("roundId", roundId);
        summary.put("totalResults", grouped.size());
        summary.put("emailsSent", sent);
        summary.put("emailsFailed", failed);
        return summary;
    }

    /** Judges' written feedback, anonymised ("Judge 1", "Judge 2", ...) and HTML-escaped for the email. */
    private String combinedFeedback(List<PitchRoundResult> results) {
        List<String> parts = new ArrayList<>();
        int judge = 1;
        for (PitchRoundResult r : results) {
            if (r.getFeedback() != null && !r.getFeedback().isBlank()) {
                String text = org.springframework.web.util.HtmlUtils.htmlEscape(r.getFeedback().trim());
                parts.add(results.size() > 1 ? "<strong>Judge " + judge + ":</strong> " + text : text);
            }
            judge++;
        }
        return parts.isEmpty() ? "No written feedback." : String.join("<br/><br/>", parts);
    }

    /** Same feedback as plain text, for the in-app view. */
    private String combinedFeedbackText(List<PitchRoundResult> results) {
        List<String> parts = new ArrayList<>();
        int judge = 1;
        for (PitchRoundResult r : results) {
            if (r.getFeedback() != null && !r.getFeedback().isBlank()) {
                parts.add(results.size() > 1 ? "Judge " + judge + ": " + r.getFeedback().trim() : r.getFeedback().trim());
            }
            judge++;
        }
        return String.join("\n\n", parts);
    }

    // ── RESULTS ───────────────────────────────────────────────────

    /** All judges' evaluations of a round, or only those of one judge when judgeEmail is set. */
    public List<PitchRoundResult> getResultsByRound(Long roundId, String judgeEmail) {
        List<PitchRoundResult> results = resultRepository.findByPitchRoundId(roundId);
        if (judgeEmail == null) return results;
        return results.stream()
                .filter(r -> judgeEmail.equalsIgnoreCase(r.getEvaluatedBy()))
                .collect(Collectors.toList());
    }

    /** All evaluations of an application, or only one judge's when judgeEmail is set. */
    public List<PitchRoundResult> getResultsByApplication(String applicationId, String judgeEmail) {
        List<PitchRoundResult> results = resultRepository.findByApplicationId(applicationId);
        if (judgeEmail == null) return results;
        return results.stream()
                .filter(r -> judgeEmail.equalsIgnoreCase(r.getEvaluatedBy()))
                .collect(Collectors.toList());
    }

    /**
     * What a founder sees: one averaged result per round, only for rounds whose results
     * the admin has sent. Judges' identities are not exposed.
     */
    public List<Map<String, Object>> getPublishedResultsByApplication(String applicationId) {
        Map<Long, List<PitchRoundResult>> byRound = resultRepository.findByApplicationId(applicationId).stream()
                .filter(r -> r.getPitchRound() != null && r.getPitchRound().getResultsSentAt() != null)
                .collect(Collectors.groupingBy(r -> r.getPitchRound().getId()));
        List<Map<String, Object>> published = new ArrayList<>();
        byRound.forEach((roundId, results) -> {
            PitchRound round = results.get(0).getPitchRound();
            double maxScore = computeRoundMaxScore(round);
            double average = averageScore(results);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", roundId);
            entry.put("roundId", roundId);
            entry.put("roundNumber", round.getRoundNumber());
            entry.put("roundName", round.getRoundName());
            entry.put("applicationId", applicationId);
            entry.put("totalScore", average);
            entry.put("maxScore", maxScore);
            entry.put("judgeCount", results.size());
            entry.put("decision", finalDecision(average, maxScore));
            entry.put("feedback", combinedFeedbackText(results));
            entry.put("aiFeedback", results.stream().map(PitchRoundResult::getAiFeedback)
                    .filter(f -> f != null && !f.isBlank()).findFirst().orElse(""));
            entry.put("evaluatedBy", "Jury");
            entry.put("evaluatedAt", round.getResultsSentAt());
            published.add(entry);
        });
        published.sort(Comparator.comparingInt(e -> e.get("roundNumber") == null ? 0 : (Integer) e.get("roundNumber")));
        return published;
    }

    /** Startups whose final (averaged) decision for the round is PASSED. */
    public List<PitchRoundResult> getPassedByRound(Long roundId) {
        PitchRound round = getRoundById(roundId);
        double maxScore = computeRoundMaxScore(round);
        List<PitchRoundResult> passed = new ArrayList<>();
        groupResultsByApplication(roundId).forEach((applicationId, results) -> {
            double average = averageScore(results);
            if (finalDecision(average, maxScore) == PitchRoundResult.RoundDecision.PASSED) {
                passed.add(PitchRoundResult.builder()
                        .applicationId(applicationId)
                        .totalScore(average)
                        .decision(PitchRoundResult.RoundDecision.PASSED)
                        .evaluatedBy(results.size() + " judge(s)")
                        .build());
            }
        });
        return passed;
    }

    public List<Map<String, Object>> getRoundRanking(Long roundId) {
        return getRoundSummary(roundId).stream().map(entry -> {
            Map<String, Object> rank = new HashMap<>();
            rank.put("applicationId", entry.get("applicationId"));
            rank.put("startupName", entry.get("startupName"));
            rank.put("totalScore", entry.get("averageScore"));
            rank.put("decision", entry.get("finalDecision"));
            rank.put("judgeCount", entry.get("judgeCount"));
            return rank;
        }).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────

    /**
     * Recomputes the PitchEvaluation that accumulates, across all rounds of the pitch phase,
     * the judges' average score of each round for one application.
     * Gemini feedback is generated once every round has at least one evaluation.
     */
    private void updateCumulativePitchEvaluation(String applicationId, PitchRound round) {
        try {
            PitchEvaluation evaluation = pitchEvaluationRepository
                    .findByApplicationId(applicationId)
                    .orElseGet(() -> PitchEvaluation.builder()
                            .applicationId(applicationId)
                            .pitchPhaseId(round.getPhase().getPhaseId())
                            .finalTotalScore(0.0)
                            .build());

            Phase phase = round.getPhase();
            List<PitchRound> allRounds = pitchRoundRepository.findByPhaseIdOrderByRoundNumberAsc(phase.getPhaseId());
            double cumulative = 0.0;
            boolean allEvaluated = true;
            for (PitchRound r : allRounds) {
                List<PitchRoundResult> roundResults = resultRepository.findByPitchRoundIdAndApplicationId(r.getId(), applicationId);
                if (roundResults.isEmpty()) {
                    allEvaluated = false;
                } else {
                    cumulative += averageScore(roundResults);
                }
            }
            cumulative = Math.round(cumulative * 100.0) / 100.0;
            evaluation.setFinalTotalScore(cumulative);

            // Derive final decision based on dynamic maximum score from configured criteria.
            double totalMaxScore = allRounds.stream()
                    .mapToDouble(this::computeRoundMaxScore)
                    .sum();
            if (totalMaxScore <= 0) {
                totalMaxScore = allRounds.size() * 5.0;
            }
            double approvedThreshold = totalMaxScore * 0.7;
            double waitlistedThreshold = totalMaxScore * 0.4;

            if (cumulative >= approvedThreshold) {
                evaluation.setFinalDecision("APPROVED");
            } else if (cumulative >= waitlistedThreshold) {
                evaluation.setFinalDecision("WAITLISTED");
            } else {
                evaluation.setFinalDecision("REJECTED");
            }

            if (allEvaluated && (evaluation.getAiGeneratedFeedback() == null || evaluation.getAiGeneratedFeedback().isBlank())) {
                String prompt = "You are a startup incubator judge. A startup just completed all pitch rounds. " +
                        "Their cumulative score is " + cumulative + " out of " +
                        totalMaxScore + " possible points. " +
                        "Their final decision is: " + evaluation.getFinalDecision() + ". " +
                        "Write a short, professional, 2-sentence feedback for the startup. " +
                        "Do not use markdown. Do not mention that you are an AI or an automated system.";
                String aiFeedback = geminiService.getAiFeedback(prompt);
                evaluation.setAiGeneratedFeedback(aiFeedback);
                log.info("Gemini final feedback generated for applicationId {}", applicationId);
            }

            pitchEvaluationRepository.save(evaluation);
        } catch (Exception e) {
            log.error("Failed to update cumulative PitchEvaluation for {}: {}", applicationId, e.getMessage());
        }
    }

    private double computeRoundMaxScore(PitchRound round) {
        if (round.getCriteriaJson() == null || round.getCriteriaJson().isBlank()) {
            return 0.0;
        }
        try {
            List<Map<String, Object>> criteria = objectMapper.readValue(
                    round.getCriteriaJson(),
                    new TypeReference<List<Map<String, Object>>>() {
                    });
            return criteria.stream()
                    .mapToDouble(c -> {
                        Object value = c.get("maxPoints");
                        if (value instanceof Number number) {
                            return number.doubleValue();
                        }
                        if (value instanceof String str) {
                            try {
                                return Double.parseDouble(str);
                            } catch (NumberFormatException ignored) {
                                return 0.0;
                            }
                        }
                        return 0.0;
                    })
                    .sum();
        } catch (Exception e) {
            log.warn("Failed to parse criteriaJson for round {}: {}", round.getId(), e.getMessage());
            return 0.0;
        }
    }

    /**
     * Resolves application → startup → user email and sends the pitch result email.
     */
    private void sendResultEmailToStartup(String applicationId, String roundName,
            Double score, String decision, String feedback, String aiFeedback) {
        try {
            Optional<Application> appOpt = applicationRepository.findById(applicationId);
            if (appOpt.isEmpty()) {
                log.warn("Cannot send pitch email — application {} not found", applicationId);
                return;
            }
            Application app = appOpt.get();

            String startupName = "your startup";
            if (app.getLinkedStartupId() != null) {
                startupName = startupRepository.findById(app.getLinkedStartupId())
                        .map(Startup::getProjectName)
                        .orElse("your startup");
            }

            String applicantEmail = null;
            if (app.getApplicantUserId() != null) {
                applicantEmail = userRepository.findById(app.getApplicantUserId())
                        .map(User::getEmailAddress)
                        .orElse(null);
            }

            if (applicantEmail != null) {
                emailService.sendPitchRoundResult(applicantEmail, startupName, roundName,
                        score, decision, feedback, aiFeedback);
            } else {
                log.warn("No email found for applicant of application {}", applicationId);
            }
        } catch (Exception e) {
            log.error("Failed to send pitch result email for application {}: {}", applicationId, e.getMessage());
        }
    }
}
