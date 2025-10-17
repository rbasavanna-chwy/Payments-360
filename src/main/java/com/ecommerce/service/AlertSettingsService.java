package com.ecommerce.service;

import com.ecommerce.model.AlertSettings;
import com.ecommerce.repository.AlertSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

@Service
public class AlertSettingsService {
    
    private final AlertSettingsRepository alertSettingsRepository;
    
    public AlertSettingsService(AlertSettingsRepository alertSettingsRepository) {
        this.alertSettingsRepository = alertSettingsRepository;
    }
    
    @PostConstruct
    public void initializeDefaultSettings() {
        // Initialize default settings if none exist
        if (alertSettingsRepository.count() == 0) {
            AlertSettings defaultSettings = new AlertSettings(75, 100);
            alertSettingsRepository.save(defaultSettings);
        }
    }
    
    public AlertSettings getAlertSettings() {
        return alertSettingsRepository.findFirstByOrderByIdDesc()
                .orElseGet(() -> {
                    // Fallback to default if not found
                    AlertSettings defaultSettings = new AlertSettings(75, 100);
                    return alertSettingsRepository.save(defaultSettings);
                });
    }
    
    @Transactional
    public AlertSettings saveAlertSettings(Integer warningThreshold, Integer criticalThreshold, String queryText) {
        // Validate thresholds
        if (warningThreshold < 0 || warningThreshold > 100) {
            throw new IllegalArgumentException("Warning threshold must be between 0 and 100");
        }
        if (criticalThreshold < 0 || criticalThreshold > 100) {
            throw new IllegalArgumentException("Critical threshold must be between 0 and 100");
        }
        if (warningThreshold >= criticalThreshold) {
            throw new IllegalArgumentException("Warning threshold must be less than critical threshold");
        }
        
        AlertSettings settings = new AlertSettings(warningThreshold, criticalThreshold, queryText);
        return alertSettingsRepository.save(settings);
    }
}

