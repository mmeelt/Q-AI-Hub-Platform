package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.ApplicationReview;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.ApplicationReviewRepository;
import tn.enicarthage.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Expert grades on applications: every expert invited to the event grades each application (/20) with a
 * recommendation; the admin sees all the grades and their average, then takes the final accept/reject decision.
 * Experts only see their own grade, so they judge independently.
 */
@Service
@RequiredArgsConstructor
public class ApplicationReviewService {

    private final ApplicationReviewRepository reviewRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JudgeAccessService judgeAccess;

    @Transactional
    public ApplicationReview submitMyReview(String applicationId, Double score,
                                            ApplicationReview.Recommendation recommendation, String comment) {
        if (judgeAccess.isAdmin()) {
            throw new AccessDeniedException("The admin takes the final decision; grades are given by the event's experts");
        }
        Application app = findApplication(applicationId);
        judgeAccess.assertCanJudgeEvent(app.getTargetEventId());
        if (!"PENDING".equalsIgnoreCase(app.getApplicationStatus())) {
            throw new IllegalStateException("This application has already been decided: grades are closed");
        }
        if (score == null || score < 0 || score > ApplicationReview.MAX_SCORE) {
            throw new IllegalArgumentException("The grade must be between 0 and 20");
        }
        if (recommendation == null) {
            throw new IllegalArgumentException("Choose a recommendation: accept or reject");
        }

        String reviewerId = SecurityContextHolder.getContext().getAuthentication().getName();
        // A grade is final once sent: the admin decides on what the experts sent
        if (reviewRepository.findByApplicationIdAndReviewerUserId(applicationId, reviewerId).isPresent()) {
            throw new IllegalStateException("Your grade has already been sent and can no longer be changed");
        }
        ApplicationReview review = ApplicationReview.builder().applicationId(applicationId).reviewerUserId(reviewerId).build();
        userRepository.findById(reviewerId).ifPresent(user -> {
            review.setReviewerEmail(user.getEmailAddress());
            review.setReviewerName(user.getFullName());
        });
        review.setScore(Math.round(score * 100) / 100.0);
        review.setRecommendation(recommendation);
        review.setComment(comment == null || comment.isBlank() ? null : comment.trim());
        review.setReviewedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    /** The admin gets every grade and the average; an invited expert only gets their own grade. */
    public Map<String, Object> getReviews(String applicationId) {
        Application app = findApplication(applicationId);
        judgeAccess.assertCanJudgeEvent(app.getTargetEventId());

        List<ApplicationReview> all = reviewRepository.findByApplicationIdOrderByReviewedAtAsc(applicationId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("maxScore", ApplicationReview.MAX_SCORE);
        if (judgeAccess.isAdmin()) {
            result.put("reviews", all);
            result.putAll(summary(all));
        } else {
            String me = SecurityContextHolder.getContext().getAuthentication().getName();
            result.put("myReview", all.stream().filter(r -> me.equals(r.getReviewerUserId())).findFirst().orElse(null));
            result.put("canGrade", "PENDING".equalsIgnoreCase(app.getApplicationStatus()));
        }
        return result;
    }

    /** Average and vote counts per application, for the admin's applicant list. */
    public Map<String, Map<String, Object>> summariesFor(Collection<String> applicationIds) {
        if (applicationIds.isEmpty()) return Map.of();
        return reviewRepository.findByApplicationIdIn(applicationIds).stream()
                .collect(Collectors.groupingBy(ApplicationReview::getApplicationId))
                .entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> summary(e.getValue())));
    }

    private Map<String, Object> summary(List<ApplicationReview> reviews) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("reviewCount", reviews.size());
        s.put("averageScore", reviews.isEmpty() ? null
                : Math.round(reviews.stream().mapToDouble(ApplicationReview::getScore).average().orElse(0) * 100) / 100.0);
        s.put("acceptVotes", reviews.stream().filter(r -> r.getRecommendation() == ApplicationReview.Recommendation.ACCEPT).count());
        s.put("rejectVotes", reviews.stream().filter(r -> r.getRecommendation() == ApplicationReview.Recommendation.REJECT).count());
        return s;
    }

    private Application findApplication(String applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + applicationId));
    }
}
