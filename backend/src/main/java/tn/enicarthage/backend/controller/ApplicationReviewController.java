package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.ApplicationReview;
import tn.enicarthage.backend.service.ApplicationReviewService;

import java.util.Map;

@Tag(name = "Application reviews", description = "Expert grades (/20) on applications; the admin decides on the average")
@RestController
@RequestMapping("/api/applications/{applicationId}/reviews")
@RequiredArgsConstructor
public class ApplicationReviewController {

    private final ApplicationReviewService reviewService;

    // GET /api/applications/{id}/reviews : admin = all grades + average, invited expert = own grade
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<Map<String, Object>> getReviews(@PathVariable String applicationId) {
        return ResponseEntity.ok(reviewService.getReviews(applicationId));
    }

    // PUT /api/applications/{id}/reviews/mine : an invited expert grades (or re-grades) the application
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/mine")
    public ResponseEntity<ApplicationReview> submitMyReview(@PathVariable String applicationId,
                                                            @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.submitMyReview(applicationId, request.score(),
                request.recommendation(), request.comment()));
    }

    record ReviewRequest(Double score, ApplicationReview.Recommendation recommendation, String comment) {
    }
}
