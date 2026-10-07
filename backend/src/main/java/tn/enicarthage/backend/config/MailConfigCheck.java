package tn.enicarthage.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Checks the email / OTP setup at startup:
 *  - refuses to start outside "dev" when the fixed test OTP is enabled (anyone could log in with it);
 *  - logs clearly whether codes are emailed, or why logins will fail.
 */
@Component
@Slf4j
public class MailConfigCheck implements ApplicationRunner {

    private final Environment environment;

    @Value("${otp.fixed.enabled:false}")
    private boolean fixedOtpEnabled;

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    public MailConfigCheck(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean dev = Arrays.asList(environment.getActiveProfiles()).contains("dev");

        if (fixedOtpEnabled && !dev) {
            throw new IllegalStateException(
                    "OTP_FIXED_ENABLED=true is only allowed with the dev profile: anyone could log in with the fixed code");
        }
        if (fixedOtpEnabled) {
            log.warn("=== OTP: FIXED TEST CODE mode (dev only). No verification email is sent. "
                    + "Set OTP_FIXED_ENABLED=false once MAIL_USERNAME / MAIL_PASSWORD are configured. ===");
            return;
        }
        boolean authRequired = environment.getProperty("spring.mail.properties.mail.smtp.auth", Boolean.class, true);
        if (host.isBlank() || (authRequired && (username.isBlank() || password.isBlank()))) {
            log.error("=== EMAIL IS NOT CONFIGURED: verification codes cannot be sent, so nobody can log in. "
                    + "Set MAIL_USERNAME and MAIL_PASSWORD in backend/.env (see .env.example). ===");
        } else {
            log.info("Email: verification codes and notifications are sent through {} as {}", host,
                    username.isBlank() ? "(no auth)" : username);
        }
    }
}
