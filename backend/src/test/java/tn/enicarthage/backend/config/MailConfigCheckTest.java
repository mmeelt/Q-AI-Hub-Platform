package tn.enicarthage.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class MailConfigCheckTest {

    private MailConfigCheck check(String profile, String user, String pass) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profile);
        MailConfigCheck c = new MailConfigCheck(env);
        ReflectionTestUtils.setField(c, "host", "smtp.gmail.com");
        ReflectionTestUtils.setField(c, "username", user);
        ReflectionTestUtils.setField(c, "password", pass);
        return c;
    }

    @Test
    void missingSmtpCredentials_onlyWarns() {
        assertDoesNotThrow(() -> check("prod", "", "").run(null));
        assertDoesNotThrow(() -> check("dev", "", "").run(null));
    }

    @Test
    void configuredSmtp_starts() {
        assertDoesNotThrow(() -> check("prod", "me@gmail.com", "app-password").run(null));
    }
}
