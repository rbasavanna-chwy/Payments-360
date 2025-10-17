package com.ecommerce.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_settings")
public class AlertSettings {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "warning_threshold", nullable = false)
    private Integer warningThreshold;
    
    @Column(name = "critical_threshold", nullable = false)
    private Integer criticalThreshold;
    
    @Column(name = "query_text", length = 1000)
    private String queryText;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Constructors
    public AlertSettings() {
    }
    
    public AlertSettings(Integer warningThreshold, Integer criticalThreshold) {
        this.warningThreshold = warningThreshold;
        this.criticalThreshold = criticalThreshold;
    }
    
    public AlertSettings(Integer warningThreshold, Integer criticalThreshold, String queryText) {
        this.warningThreshold = warningThreshold;
        this.criticalThreshold = criticalThreshold;
        this.queryText = queryText;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getWarningThreshold() {
        return warningThreshold;
    }
    
    public void setWarningThreshold(Integer warningThreshold) {
        this.warningThreshold = warningThreshold;
    }
    
    public Integer getCriticalThreshold() {
        return criticalThreshold;
    }
    
    public void setCriticalThreshold(Integer criticalThreshold) {
        this.criticalThreshold = criticalThreshold;
    }
    
    public String getQueryText() {
        return queryText;
    }
    
    public void setQueryText(String queryText) {
        this.queryText = queryText;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

