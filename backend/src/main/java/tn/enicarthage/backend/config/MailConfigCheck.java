package tn.enicarthage.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Checks the email setup at startup and logs clearly whether verification codes can be
 * emailed, or why logins will fail. Codes are always random and always sent by email.
 */
@Component
@Slf4j
public class MailConfigCheck implements ApplicationRunner {

    private final Environment environment;

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
