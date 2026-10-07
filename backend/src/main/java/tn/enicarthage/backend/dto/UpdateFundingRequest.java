package tn.enicarthage.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class UpdateFundingRequest {
    private BigDecimal amount;
}
