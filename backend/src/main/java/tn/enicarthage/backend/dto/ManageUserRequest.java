package tn.enicarthage.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ManageUserRequest {

    @NotBlank(message = "action must not be blank")
    private String action;
}
