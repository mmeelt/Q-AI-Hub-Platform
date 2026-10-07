package tn.enicarthage.backend.repository;

import tn.enicarthage.backend.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, String> {
    Optional<OtpToken> findByOtpSessionId(String otpSessionId);
    List<OtpToken> findByUserId(String userId);
    void deleteByExpiryTimeBefore(Date date);
    void deleteByUserId(String userId);
}
