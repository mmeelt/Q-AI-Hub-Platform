package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.PitchRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PitchRoundRepository extends JpaRepository<PitchRound, Long> {

    @Query("SELECT pr FROM PitchRound pr WHERE pr.phase.phaseId = :phaseId ORDER BY pr.roundNumber ASC")
    List<PitchRound> findByPhaseIdOrderByRoundNumberAsc(@Param("phaseId") String phaseId);
}
