package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.PitchEvaluation;
import java.util.List;
import java.util.Optional;

@Repository
public interface PitchEvaluationRepository extends JpaRepository<PitchEvaluation, String> {
    List<PitchEvaluation> findByPitchPhaseId(String pitchPhaseId);
    /** Primary lookup: one cumulative record per application. */
    Optional<PitchEvaluation> findByApplicationId(String applicationId);
    /** Kept for backward compatibility — will find by the evaluatorAdminId field. */
    Optional<PitchEvaluation> findByEvaluatorAdminId(String evaluatorAdminId);
}
