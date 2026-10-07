package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.Startup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StartupRepository extends JpaRepository<Startup, String> {
    List<Startup> findByFounderUserId(String founderUserId);
    List<Startup> findByStartupStatus(Startup.StartupStatus startupStatus);
    List<Startup> findByStartupIdIn(List<String> startupIds);
    boolean existsByFounderUserId(String founderUserId);
}
