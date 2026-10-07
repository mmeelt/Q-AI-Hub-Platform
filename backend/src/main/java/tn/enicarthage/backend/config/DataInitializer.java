package tn.enicarthage.backend.config;

import tn.enicarthage.backend.entity.*;
import tn.enicarthage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

/**
 * Local development demo data ("dev" profile only).
 * Each block runs only when its table is EMPTY, i.e. on a brand-new database:
 * existing data (phases, questions, pitch rounds...) is never modified at startup.
 * Data fixes for existing databases belong in Flyway migrations (db/migration).
 */
@Component
@org.springframework.context.annotation.Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final AdminRepository adminRepository;
    private final PlatformSettingRepository platformSettingRepository;
    private final EventRepository eventRepository;
    private final PhaseRepository phaseRepository;
    private final PasswordEncoder passwordEncoder;
    private final PitchRoundRepository pitchRoundRepository;

    // Demo passwords come from backend/.env (SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD).
    // Left empty, a random one is generated and printed once in the log: no default password in the code.
    @org.springframework.beans.factory.annotation.Value("${app.seed.admin-password:}")
    private String seedAdminPassword;

    @org.springframework.beans.factory.annotation.Value("${app.seed.user-password:}")
    private String seedUserPassword;

    @Override
    public void run(ApplicationArguments args) {
        // Demo data only for a brand-new database (no admin yet). A database that was emptied on
        // purpose (only the admin kept) must stay empty after a restart.
        boolean brandNewDatabase = adminRepository.count() == 0;

        if (brandNewDatabase && userRepository.count() == 0) {
            String userPassword = orRandom(seedUserPassword);
            userRepository.save(User.builder()
                    .userId("user_1")
                    .emailAddress("test@mail.com")
                    .passwordHash(passwordEncoder.encode(userPassword))
                    .fullName("Test User")
                    .userStatus(User.UserStatus.ACTIVE)
                    .accountCreatedAt(new Date())
                    .build());
            startupRepository.save(Startup.builder()
                    .startupId("startup_1")
                    .founderUserId("user_1")
                    .projectName("TechVenture")
                    .startupStatus(Startup.StartupStatus.ACTIVE)
                    .totalFundingRaised(BigDecimal.ZERO)
                    .currentTeamSize(1)
                    .build());
            log.info("Dev seed: test user test@mail.com with startup TechVenture{}",
                    seedUserPassword == null || seedUserPassword.isBlank() ? ", generated password: " + userPassword : "");
        }

        if (adminRepository.count() == 0) {
            String adminPassword = orRandom(seedAdminPassword);
            adminRepository.save(Admin.builder()
                    .adminId("admin_1")
                    .adminEmail("admin@platform.com")
                    .adminName("Admin")
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .adminRole("SUPER_ADMIN")
                    .build());
            log.warn("Dev seed: admin admin@platform.com created{}. Change its email to a real inbox "
                    + "and its password before using real login codes.",
                    seedAdminPassword == null || seedAdminPassword.isBlank() ? " with generated password: " + adminPassword : "");
        }

        if (platformSettingRepository.count() == 0) {
            platformSettingRepository.save(PlatformSetting.builder()
                    .settingsId("settings_1")
                    .allowPublicRegistrations(true)
                    .requireEmailVerification(true)  // same safe defaults as production
                    .allowLateSubmissions(false)
                    .showAnonymousToJury(false)
                    .lastUpdatedAt(new Date())
                    .build());
        }

        if (brandNewDatabase && eventRepository.count() == 0) {
            seedDemoEvent();
        }
    }

    /** One incubation event with its 3 phases and 2 pitch rounds, for a brand-new database. */
    private void seedDemoEvent() {
        eventRepository.save(Event.builder()
                .eventId("event_1")
                .title("National AI Challenge 2024")
                .category("Artificial Intelligence")
                .description("A nationwide competition for AI startups to showcase their innovations.")
                .status(Event.EventStatus.ACTIVE)
                .eventType(Event.EventType.INCUBATION)
                .hasPitch(true)
                .maxParticipants(50)
                .currentRegisteredCount(0)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(30))
                .applicationDeadline(LocalDate.now().plusDays(5))
                .tags(List.of("AI", "Innovation", "Startup"))
                .build());

        phaseRepository.save(Phase.builder()
                .phaseId("phase_1").eventId("event_1").phaseName("Application Phase")
                .phaseType(Phase.PhaseType.QUESTIONNAIRE).phaseOrder(1).phaseActive(false).build());
        phaseRepository.save(Phase.builder()
                .phaseId("phase_2").eventId("event_1").phaseName("Technical Review")
                .phaseType(Phase.PhaseType.QUESTIONNAIRE).phaseOrder(2).phaseActive(false).build());
        Phase pitch = phaseRepository.save(Phase.builder()
                .phaseId("phase_3").eventId("event_1").phaseName("Pitch Evaluation")
                .phaseType(Phase.PhaseType.PITCH).phaseOrder(3).phaseActive(false).build());

        pitchRoundRepository.save(PitchRound.builder()
                .phase(pitch).roundNumber(1).roundName("Ideation Round")
                .roundDate(LocalDateTime.now().plusDays(40))
                .criteriaJson("[{\"criterion\":\"Problem-Solution Fit\",\"maxPoints\":5},"
                        + "{\"criterion\":\"Team Strength\",\"maxPoints\":5},{\"criterion\":\"Innovation Level\",\"maxPoints\":5}]")
                .build());
        pitchRoundRepository.save(PitchRound.builder()
                .phase(pitch).roundNumber(2).roundName("Screening Round")
                .roundDate(LocalDateTime.now().plusDays(50))
                .criteriaJson("[{\"criterion\":\"Market Strategy\",\"maxPoints\":5},"
                        + "{\"criterion\":\"Revenue Model\",\"maxPoints\":5},{\"criterion\":\"Scalability\",\"maxPoints\":5}]")
                .build());
        log.info("Dev seed: demo event 'National AI Challenge 2024' with 3 phases and 2 pitch rounds");
    }

    private static String orRandom(String configured) {
        if (configured != null && !configured.isBlank()) return configured;
        byte[] bytes = new byte[12];
        new java.security.SecureRandom().nextBytes(bytes);
        // letters + digits + a symbol so it passes the password policy
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) + "#7";
    }
}
