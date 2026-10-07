package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "admins")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Admin {

    @Id
    private String adminId;

    private String adminName;

    @Column(unique = true, nullable = false)
    private String adminEmail;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    private String adminRole;
    private String departmentName;

    @ElementCollection
    @CollectionTable(name = "admin_permissions", joinColumns = @JoinColumn(name = "admin_id"))
    @Column(name = "permission")
    private List<String> adminPermissions;

    @Temporal(TemporalType.TIMESTAMP)
    private Date lastSignInAt;
}
