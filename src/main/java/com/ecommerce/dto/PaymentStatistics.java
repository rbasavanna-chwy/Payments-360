package com.ecommerce.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatistics {
    private Long totalPayments;
    private Long completedPayments;
    private Long pendingPayments;
    private Long failedPayments;
    private Long refundedPayments;
    private Double totalAmount;
    private Double completedAmount;
    private Double successRate;
    private Double averageTransactionAmount;
}
