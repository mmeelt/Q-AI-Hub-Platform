package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Admin invitation for a participant (startup founder / team member) to create an account. */
@Data
public class InviteUserRequest {
    @NotBlank(message = "email must not be blank")
    @Email(message = "email must be a valid address")
    private String email;

    @Size(max = 1000, message = "message is too long (max 1000 characters)")
    private String message;
}
