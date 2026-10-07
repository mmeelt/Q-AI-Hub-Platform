package tn.enicarthage.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.enicarthage.backend.entity.Application;

import java.util.Optional;
import java.util.List;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, String> {
    Optional<Application> findByTrackingCode(String trackingCode);

    List<Application> findByTargetEventId(String targetEventId);
    List<Application> findByApplicantUserId(String applicantUserId);
    List<Application> findByLinkedStartupId(String linkedStartupId);
    List<Application> findByLinkedStartupIdIn(List<String> startupIds);
    List<Application> findByApplicationStatus(String applicationStatus);
    List<Application> findByTargetEventIdAndApplicationStatus(String targetEventId, String applicationStatus);
    boolean existsByApplicantUserIdAndTargetEventId(String applicantUserId, String targetEventId);
}

