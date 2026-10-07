package tn.enicarthage.backend.dto;

import lombok.Data;

@Data
public class InviteTeammateRequest {
    private String startupId;
    private String applicationId;
    private String email;
    private String role;
    private String personalMessage;
}
