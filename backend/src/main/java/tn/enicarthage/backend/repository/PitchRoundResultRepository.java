package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.PitchRoundResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PitchRoundResultRepository extends JpaRepository<PitchRoundResult, Long> {
    List<PitchRoundResult> findByPitchRoundId(Long pitchRoundId);
    // One row per judge: several results can exist for the same round + application
    List<PitchRoundResult> findByPitchRoundIdAndApplicationId(Long pitchRoundId, String applicationId);

    Optional<PitchRoundResult> findByPitchRoundIdAndApplicationIdAndEvaluatedByIgnoreCase(
            Long pitchRoundId, String applicationId, String evaluatedBy);
    List<PitchRoundResult> findByApplicationId(String applicationId);
    List<PitchRoundResult> findByPitchRoundIdAndDecision(Long pitchRoundId, PitchRoundResult.RoundDecision decision);
}
