package tn.enicarthage.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class StartupMetricsRequest {
    private BigDecimal monthlyRevenue;
    private Double growthRatePct;
    private BigDecimal monthlyBurnRate;
    private Integer overallProgressPct;
    private Double accuracyRatePct;
    private BigDecimal totalFundingRaised;
}
