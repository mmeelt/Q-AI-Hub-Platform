package tn.enicarthage.backend.dto;

import tn.enicarthage.backend.entity.Startup;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class StartupResponse {
    private String startupId;
    private String projectName;
    private String founderUserId;
    private Startup.StartupStatus startupStatus;
    private BigDecimal totalFundingRaised;
    private Integer currentTeamSize;

    // Metrics
    private BigDecimal monthlyRevenue;
    private Double growthRatePct;
    private BigDecimal monthlyBurnRate;
    private Integer overallProgressPct;
    private Double accuracyRatePct;
}
