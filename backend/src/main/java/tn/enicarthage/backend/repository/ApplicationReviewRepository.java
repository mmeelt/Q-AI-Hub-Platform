package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.enicarthage.backend.entity.ApplicationReview;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ApplicationReviewRepository extends JpaRepository<ApplicationReview, Long> {

    List<ApplicationReview> findByApplicationIdOrderByReviewedAtAsc(String applicationId);

    Optional<ApplicationReview> findByApplicationIdAndReviewerUserId(String applicationId, String reviewerUserId);

    List<ApplicationReview> findByApplicationIdIn(Collection<String> applicationIds);
}
