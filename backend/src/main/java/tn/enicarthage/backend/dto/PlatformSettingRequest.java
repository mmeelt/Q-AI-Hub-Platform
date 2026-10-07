package tn.enicarthage.backend.dto;

import lombok.Data;

@Data
public class PlatformSettingRequest {
    private Boolean allowPublicRegistrations;
    private Boolean requireEmailVerification;
    private Boolean allowLateSubmissions;
    private Boolean showAnonymousToJury;
}
