package tn.enicarthage.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class MailConfigCheckTest {

    private MailConfigCheck check(String profile, boolean fixedOtp, String user, String pass) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profile);
        MailConfigCheck c = new MailConfigCheck(env);
        ReflectionTestUtils.setField(c, "fixedOtpEnabled", fixedOtp);
        ReflectionTestUtils.setField(c, "host", "smtp.gmail.com");
        ReflectionTestUtils.setField(c, "username", user);
        ReflectionTestUtils.setField(c, "password", pass);
        return c;
    }

    @Test
    void fixedTestCode_isRefusedOutsideDev() {
        // anyone could log in with the fixed code in production
        assertThrows(IllegalStateException.class, () -> check("prod", true, "", "").run(null));
    }

    @Test
    void fixedTestCode_isAllowedInDev() {
        assertDoesNotThrow(() -> check("dev", true, "", "").run(null));
    }

    @Test
    void missingSmtpCredentials_onlyWarns() {
        assertDoesNotThrow(() -> check("prod", false, "", "").run(null));
        assertDoesNotThrow(() -> check("prod", false, "me@gmail.com", "app-password").run(null));
    }
}
