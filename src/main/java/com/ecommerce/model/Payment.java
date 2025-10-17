package com.ecommerce.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String transactionId;
    
    @Column(nullable = false, unique = true)
    private String paymentReferenceId;
    
    @Column(nullable = false)
    private String customerId;
    
    @Column(nullable = false)
    private String customerName;
    
    @Column(nullable = false)
    private String customerEmail;
    
    @Column(nullable = false)
    private Double amount;
    
    @Column(nullable = false)
    private String currency;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;
    
    @Column
    private String cardType;
    
    @Column
    private String validationStatus;
    
    @Column
    private String orderType;
    
    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @Column
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    @Column
    private String description;
    
    @Column
    private String errorMessage;
    
    @Column
    private String orderId;
    
    @Column
    private String ipAddress;
    
    @Column
    private String country;
    
    @Column
    private Double approvalAmount;
    
    @Column
    private Double approvedAmount;
    
    @Column
    private Double depositingAmount;
    
    @Column
    private Double depositedAmount;
    
    @Column
    private Double reversingApprovalAmount;
    
    @Column
    private Double reversingApprovedAmount;
    
    @Column
    private Double refundAmount;
    
    @Column
    private Double refundedAmount;
    
    @Column
    private String orderStatus;
}
