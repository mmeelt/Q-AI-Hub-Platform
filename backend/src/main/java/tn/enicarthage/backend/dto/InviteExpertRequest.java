package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteExpertRequest {

    @NotBlank(message = "email must not be blank")
    @Email(message = "email must be a valid address")
    private String email;

    @NotBlank(message = "expertRole must not be blank")
    private String expertRole;

    private String eventId;

    // Optional personal note added to the invitation email
    @jakarta.validation.constraints.Size(max = 1000, message = "message is too long (max 1000 characters)")
    private String message;
}
