package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.Pitch;
import java.util.List;

@Repository
public interface PitchRepository extends JpaRepository<Pitch, String> {
    // Custom method to find all pitches for a specific startup
    List<Pitch> findByPresentingStartupId(String presentingStartupId);
}
