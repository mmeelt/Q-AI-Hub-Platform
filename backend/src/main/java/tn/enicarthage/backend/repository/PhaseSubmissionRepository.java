package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.PhaseSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhaseSubmissionRepository extends JpaRepository<PhaseSubmission, Long> {

    // Find all submissions for a specific phase
    @Query("SELECT s FROM PhaseSubmission s WHERE s.phase.phaseId = :phaseId")
    List<PhaseSubmission> findByPhaseId(@Param("phaseId") String phaseId);

    // Find submission by phase and application
    @Query("SELECT s FROM PhaseSubmission s WHERE s.phase.phaseId = :phaseId AND s.sourceApplicationId = :applicationId")
    Optional<PhaseSubmission> findByPhaseIdAndSourceApplicationId(@Param("phaseId") String phaseId, @Param("applicationId") String applicationId);

    // Find all submissions for a specific application
    List<PhaseSubmission> findBySourceApplicationId(String applicationId);

    // Find all graded submissions for a phase
    @Query("SELECT s FROM PhaseSubmission s WHERE s.phase.phaseId = :phaseId AND s.status = :status")
    List<PhaseSubmission> findByPhaseIdAndStatus(@Param("phaseId") String phaseId, @Param("status") PhaseSubmission.SubmissionStatus status);

    // Count passed submissions for a phase
    @Query("SELECT COUNT(s) FROM PhaseSubmission s WHERE s.phase.phaseId = :phaseId AND (s.decisionStatus = 'ACCEPTED' OR (s.decisionStatus = 'PENDING' AND s.phase.phaseOrder > 1 AND s.status = 'GRADED' AND s.evaluationScore >= 50))")
    Long countPassedByPhaseId(@Param("phaseId") String phaseId);

    @Query("SELECT COUNT(s) FROM PhaseSubmission s WHERE s.phase.phaseId = :phaseId AND s.status = 'DRAFT'")
    Long countDraftsByPhaseId(@Param("phaseId") String phaseId);

    List<PhaseSubmission> findTop5ByOrderBySubmittedAtDesc();
}
