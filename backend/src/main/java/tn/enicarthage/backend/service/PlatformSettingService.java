package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.PlatformSettingRequest;
import tn.enicarthage.backend.entity.PlatformSetting;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.PlatformSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Date;


@Service
@RequiredArgsConstructor
public class PlatformSettingService {

    private final PlatformSettingRepository platformSettingRepository;

    public void toggleFeature(String key, Object value) {
        PlatformSetting settings = getGlobalSettingsEntity();
        // Implement complex logic to update nested JSON if needed
        // For now, update something simple or stub
        settings.setLastUpdatedAt(new Date());
        platformSettingRepository.save(settings);
    }

    public void addQuestionToBank(Object questionData) {
        PlatformSetting settings = getGlobalSettingsEntity();
        settings.setGlobalQuestionBank(questionData.toString());
        settings.setLastUpdatedAt(new Date());
        platformSettingRepository.save(settings);
    }

    public void removeQuestionFromBank(String questionId) {
        PlatformSetting settings = getGlobalSettingsEntity();
        settings.setLastUpdatedAt(new Date());
        platformSettingRepository.save(settings);
    }

    public void updateStartupFormFields(Object fields) {
        PlatformSetting settings = getGlobalSettingsEntity();
        settings.setGlobalStartupFormFields(fields.toString());
        settings.setLastUpdatedAt(new Date());
        platformSettingRepository.save(settings);
    }

    public void saveSettings() {
        platformSettingRepository.save(getGlobalSettingsEntity());
    }

    public Object getGlobalSettings() {
        return getGlobalSettingsEntity();
    }

    /** The single settings row, created with safe defaults the first time (e.g. a fresh production DB). */
    private PlatformSetting getGlobalSettingsEntity() {
        return platformSettingRepository.findAll().stream().findFirst()
                .orElseGet(() -> platformSettingRepository.save(PlatformSetting.builder()
                        .settingsId("settings_1")
                        .allowPublicRegistrations(true)
                        .requireEmailVerification(true)
                        .allowLateSubmissions(false)
                        .showAnonymousToJury(false)
                        .lastUpdatedAt(new Date())
                        .build()));
    }

    // ── Effective values used by the rest of the backend (null-safe, with defaults) ──

    /** Anyone may create an account (otherwise only invited experts can register). Default: true. */
    public boolean publicRegistrationsAllowed() {
        return !Boolean.FALSE.equals(getGlobalSettingsEntity().getAllowPublicRegistrations());
    }

    /** Email code at every user login. When false, the code is only asked once to verify the email. Default: true. */
    public boolean emailCodeAtEveryLogin() {
        return !Boolean.FALSE.equals(getGlobalSettingsEntity().getRequireEmailVerification());
    }

    /** Applications/registrations are still accepted after an event's deadline. Default: false. */
    public boolean lateSubmissionsAllowed() {
        return Boolean.TRUE.equals(getGlobalSettingsEntity().getAllowLateSubmissions());
    }

    /** Judges (not admins) see anonymised applicants. Default: false. */
    public boolean anonymousToJury() {
        return Boolean.TRUE.equals(getGlobalSettingsEntity().getShowAnonymousToJury());
    }

    public void updatePlatformData(PlatformSettingRequest dto) {
        PlatformSetting settings = getGlobalSettingsEntity();
        if (dto.getAllowPublicRegistrations() != null) settings.setAllowPublicRegistrations(dto.getAllowPublicRegistrations());
        if (dto.getRequireEmailVerification() != null) settings.setRequireEmailVerification(dto.getRequireEmailVerification());
        if (dto.getAllowLateSubmissions() != null) settings.setAllowLateSubmissions(dto.getAllowLateSubmissions());
        if (dto.getShowAnonymousToJury() != null) settings.setShowAnonymousToJury(dto.getShowAnonymousToJury());
        settings.setLastUpdatedAt(new Date());
        platformSettingRepository.save(settings);
    }
}
