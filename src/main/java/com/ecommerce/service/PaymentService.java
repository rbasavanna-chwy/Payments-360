package com.ecommerce.service;

import com.ecommerce.dto.PaymentStatistics;
import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentMethod;
import com.ecommerce.model.PaymentStatus;
import com.ecommerce.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    
    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    
    @Transactional
    public Payment createPayment(Payment payment) {
        payment.setTransactionId(generateTransactionId());
        payment.setCreatedAt(LocalDateTime.now());
        payment.setStatus(PaymentStatus.PENDING);
        return paymentRepository.save(payment);
    }
    
    @Transactional
    public Payment updatePaymentStatus(Long id, PaymentStatus status, String errorMessage) {
        Optional<Payment> paymentOpt = paymentRepository.findById(id);
        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            payment.setStatus(status);
            payment.setUpdatedAt(LocalDateTime.now());
            if (errorMessage != null) {
                payment.setErrorMessage(errorMessage);
            }
            return paymentRepository.save(payment);
        }
        throw new RuntimeException("Payment not found with id: " + id);
    }
    
    public List<Payment> getAllPayments() {
        return paymentRepository.findAllOrderByCreatedAtDesc();
    }
    
    public List<Payment> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status);
    }
    
    public List<Payment> getRecentPayments(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return paymentRepository.findRecentPayments(since);
    }
    
    public Optional<Payment> getPaymentById(Long id) {
        return paymentRepository.findById(id);
    }
    
    public PaymentStatistics getPaymentStatistics() {
        List<Payment> allPayments = paymentRepository.findAll();
        
        long total = allPayments.size();
        long completed = paymentRepository.countByStatus(PaymentStatus.COMPLETED);
        long pending = paymentRepository.countByStatus(PaymentStatus.PENDING);
        long failed = paymentRepository.countByStatus(PaymentStatus.FAILED);
        long refunded = paymentRepository.countByStatus(PaymentStatus.REFUNDED);
        
        Double totalAmount = allPayments.stream()
                .mapToDouble(Payment::getAmount)
                .sum();
        
        Double completedAmount = paymentRepository.sumAmountByStatus(PaymentStatus.COMPLETED);
        if (completedAmount == null) completedAmount = 0.0;
        
        double successRate = total > 0 ? (completed * 100.0) / total : 0.0;
        double avgTransaction = total > 0 ? totalAmount / total : 0.0;
        
        return new PaymentStatistics(
                total,
                completed,
                pending,
                failed,
                refunded,
                totalAmount,
                completedAmount,
                successRate,
                avgTransaction
        );
    }
    
    public Map<String, Object> getAgedMetrics(String orderType, String paymentMethod, String paymentState, String dateFilter, String frequency) {
        // Fetch all payments
        List<Payment> payments = paymentRepository.findAllOrderByCreatedAtDesc();
        LocalDateTime now = LocalDateTime.now();
        
        // Apply filters
        payments = payments.stream()
            .filter(p -> {
                // Date filter
                if (dateFilter != null && !dateFilter.equals("all")) {
                    long daysDiff = ChronoUnit.DAYS.between(p.getCreatedAt(), now);
                    if (dateFilter.equals("last_7_days") && daysDiff > 7) return false;
                    if (dateFilter.equals("last_28_days") && daysDiff > 28) return false;
                    if (dateFilter.equals("last_30_days") && daysDiff > 30) return false;
                }
                // Order type filter
                if (orderType != null && !orderType.equals("all") && p.getOrderType() != null && !p.getOrderType().equalsIgnoreCase(orderType)) return false;
                // Payment method filter - remove underscores and compare case-insensitively
                if (paymentMethod != null && !paymentMethod.equals("all")) {
                    String enumMethod = p.getPaymentMethod().name().toLowerCase().replace("_", "");
                    String filterMethod = paymentMethod.toLowerCase().replace("_", "");
                    if (!enumMethod.equals(filterMethod)) return false;
                }
                // Payment state filter - remove underscores and compare case-insensitively
                if (paymentState != null && !paymentState.equals("all")) {
                    String enumState = p.getStatus().name().toLowerCase().replace("_", "");
                    String filterState = paymentState.toLowerCase().replace("_", "");
                    if (!enumState.equals(filterState)) return false;
                }
                return true;
            })
            .collect(Collectors.toList());
        
        // Get dynamic age groups based on date filter and frequency
        List<Map<String, Object>> ageGroups = getDynamicAgeGroups(dateFilter, frequency);
        
        // Calculate metrics for each age group based on frequency
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> group : ageGroups) {
            int minValue = (int) group.get("min");
            int maxValue = (int) group.get("max");
            String label = (String) group.get("label");
            String unit = (String) group.get("unit");
            
            List<Payment> groupPayments = payments.stream()
                .filter(p -> {
                    long diff = 0;
                    switch (unit) {
                        case "hours":
                            diff = ChronoUnit.HOURS.between(p.getCreatedAt(), now);
                            break;
                        case "days":
                            diff = ChronoUnit.DAYS.between(p.getCreatedAt(), now);
                            break;
                        case "weeks":
                            diff = ChronoUnit.WEEKS.between(p.getCreatedAt(), now);
                            break;
                        case "months":
                            diff = ChronoUnit.MONTHS.between(p.getCreatedAt(), now);
                            break;
                        default:
                            diff = ChronoUnit.DAYS.between(p.getCreatedAt(), now);
                    }
                    return diff >= minValue && diff < maxValue;
                })
                .collect(Collectors.toList());
            
            int count = groupPayments.size();
            double amount = groupPayments.stream().mapToDouble(Payment::getAmount).sum();
            
            // Convert Payment objects to a simpler map structure for frontend
            List<Map<String, Object>> transactions = groupPayments.stream()
                .map(p -> {
                    Map<String, Object> transaction = new HashMap<>();
                    transaction.put("id", p.getId());
                    transaction.put("orderId", p.getOrderId());
                    transaction.put("transactionId", p.getTransactionId());
                    transaction.put("orderType", p.getOrderType());
                    transaction.put("amount", p.getAmount());
                    transaction.put("currency", p.getCurrency());
                    transaction.put("paymentMethod", formatEnumValue(p.getPaymentMethod().name()));
                    transaction.put("paymentState", formatEnumValue(p.getStatus().name()));
                    transaction.put("customerName", p.getCustomerName());
                    transaction.put("customerEmail", p.getCustomerEmail());
                    transaction.put("customerId", p.getCustomerId());
                    transaction.put("date", p.getCreatedAt().toString());
                    transaction.put("lastUpdated", p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : p.getCreatedAt().toString()); // Added lastUpdated field
                    transaction.put("description", p.getDescription());
                    transaction.put("country", p.getCountry());
                    transaction.put("ipAddress", p.getIpAddress());
                    transaction.put("errorMessage", p.getErrorMessage());
                    return transaction;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> item = new HashMap<>();
            item.put("label", label);
            item.put("count", count);
            item.put("amount", String.format("$%.2f", amount));
            item.put("highlight", false); // Can be customized based on business logic
            item.put("transactions", transactions); // Add transactions array
            items.add(item);
        }
        
        // Calculate totals
        int totalCount = payments.size();
        double totalAmount = payments.stream().mapToDouble(Payment::getAmount).sum();
        
        Map<String, Object> total = new HashMap<>();
        total.put("count", totalCount);
        total.put("amount", String.format("$%.2f", totalAmount));
        
        // Return result
        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("total", total);
        
        return result;
    }
    
    private List<Map<String, Object>> getDynamicAgeGroups(String dateFilter, String frequency) {
        List<Map<String, Object>> groups = new ArrayList<>();
        
        // Use frequency parameter, default to daily if not specified
        if (frequency == null) frequency = "daily";
        
        // Calculate the time range in appropriate units based on date filter
        int totalUnits = getTimeRangeInUnits(dateFilter, frequency);
        
        // Generate dynamic time buckets based on frequency and date range
        switch (frequency.toLowerCase()) {
            case "hourly":
                // Create hourly buckets
                for (int i = 0; i < totalUnits; i++) {
                    String label = i + "h ago";
                    groups.add(createAgeGroup(label, i, i + 1, "hours"));
                }
                break;
                
            case "weekly":
                // Create weekly buckets
                for (int i = 0; i < totalUnits; i++) {
                    String label = "Week " + (i + 1);
                    groups.add(createAgeGroup(label, i, i + 1, "weeks"));
                }
                break;
                
            case "monthly":
                // Create monthly buckets
                for (int i = 0; i < totalUnits; i++) {
                    String label = "Month " + (i + 1);
                    groups.add(createAgeGroup(label, i, i + 1, "months"));
                }
                break;
                
            case "daily":
            default:
                // Create daily buckets
                for (int i = 0; i < totalUnits; i++) {
                    String label = (i == 0) ? "Today" : (i == 1) ? "Yesterday" : i + " days ago";
                    groups.add(createAgeGroup(label, i, i + 1, "days"));
                }
                break;
        }
        
        return groups;
    }
    
    private int getTimeRangeInUnits(String dateFilter, String frequency) {
        // Determine how many time units to show based on date filter and frequency
        if (dateFilter == null) dateFilter = "last_7_days";
        
        switch (frequency.toLowerCase()) {
            case "hourly":
                // For hourly, show hours based on date filter
                if (dateFilter.equals("last_24_hours") || dateFilter.equals("today")) return 24;
                if (dateFilter.equals("yesterday")) return 24;
                return 24; // Default to 24 hours
                
            case "weekly":
                // For weekly, calculate weeks from days
                if (dateFilter.equals("last_7_days") || dateFilter.equals("last_week")) return 1;
                if (dateFilter.equals("last_28_days")) return 4;
                if (dateFilter.equals("last_30_days") || dateFilter.equals("last_month") || 
                    dateFilter.equals("last_1_month")) return 4;
                if (dateFilter.equals("last_90_days")) return 13; // ~3 months
                return 8; // Default to 8 weeks
                
            case "monthly":
                // For monthly, calculate months
                if (dateFilter.equals("last_30_days") || dateFilter.equals("last_month") || 
                    dateFilter.equals("last_1_month")) return 1;
                if (dateFilter.equals("last_90_days")) return 3;
                if (dateFilter.equals("last_7_days")) return 1;
                if (dateFilter.equals("last_28_days")) return 1;
                return 6; // Default to 6 months
                
            case "daily":
            default:
                // For daily, use exact days from date filter
                if (dateFilter.equals("last_24_hours") || dateFilter.equals("today") || 
                    dateFilter.equals("yesterday")) return 1;
                if (dateFilter.equals("last_7_days") || dateFilter.equals("last_week")) return 7;
                if (dateFilter.equals("last_28_days")) return 28;
                if (dateFilter.equals("last_30_days") || dateFilter.equals("last_month") || 
                    dateFilter.equals("last_1_month")) return 30;
                if (dateFilter.equals("last_90_days")) return 90;
                return 7; // Default to 7 days
        }
    }
    
    private Map<String, Object> createAgeGroup(String label, int min, int max, String unit) {
        Map<String, Object> group = new HashMap<>();
        group.put("label", label);
        group.put("min", min);
        group.put("max", max);
        group.put("unit", unit);
        return group;
    }
    
    private String formatEnumValue(String enumValue) {
        if (enumValue == null) return "";
        // Convert CREDIT_CARD to Credit Card
        return Arrays.stream(enumValue.split("_"))
            .map(word -> word.charAt(0) + word.substring(1).toLowerCase())
            .collect(Collectors.joining(" "));
    }
    
    @PostConstruct
    @Transactional
    public void generateSampleData() {
        if (paymentRepository.count() > 0) {
            return;
        }
        
        System.out.println("🚀 Generating comprehensive payment data for 90 days...");
        
        String[] customerNames = {"John Doe", "Jane Smith", "Bob Johnson", "Alice Williams", "Charlie Brown", 
                                  "David Miller", "Emma Wilson", "Frank Davis", "Grace Lee", "Henry Taylor"};
        String[] countries = {"USA", "UK", "Canada", "Australia", "Germany", "France", "Japan", "Brazil"};
        String[] orderTypes = {"Regular", "Subscription", "Loyalty", "CVC_No_Show_Penality", "Onetime", "CWAV_Telemedicine"};
        String[] cardBrands = {"VISA", "DISCOVER", "AMEX", "MASTERCARD"};
        PaymentMethod[] methods = PaymentMethod.values();
        
        Random random = new Random();
        LocalDateTime now = LocalDateTime.now();
        
        // Generate ~10-15 payments per day for 90 days = 900-1350 payments
        int totalPayments = 1000;
        int paymentsPerDay = totalPayments / 90;
        
        int creditCardCounter = 0;
        int paymentCounter = 1;
        
        // Generate payments for 90 days (from 89 days ago to today)
        // Ensure even distribution - generate exactly paymentsPerDay for each day
        for (int day = 0; day < 90; day++) {
            // Always generate the same number of payments per day for even distribution
            int paymentsForDay = paymentsPerDay;
            
            // Add a few extra payments to the last few days to use up remaining quota
            if (day >= 85 && paymentCounter + paymentsForDay <= totalPayments) {
                int remaining = totalPayments - paymentCounter;
                int daysLeft = 90 - day;
                paymentsForDay = Math.min(paymentsForDay + 2, remaining / daysLeft + 1);
            }
            
            for (int p = 0; p < paymentsForDay; p++) {
                if (paymentCounter > totalPayments) break;
                
                Payment payment = new Payment();
                
                // Generate unique IDs
                payment.setTransactionId(generateTransactionId());
                payment.setPaymentReferenceId("PREF" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                payment.setOrderId("ORD" + String.format("%06d", paymentCounter));
                
                // Customer details
                payment.setCustomerId("CUST" + String.format("%05d", (paymentCounter % customerNames.length) + 1));
                payment.setCustomerName(customerNames[paymentCounter % customerNames.length]);
                payment.setCustomerEmail(payment.getCustomerName().toLowerCase().replace(" ", ".") + "@example.com");
                
                // Amount and currency
                payment.setAmount(Math.round((random.nextDouble() * 500 + 10) * 100.0) / 100.0);
                payment.setCurrency("USD");
                
                // Request time and creation time (within the day)
                // day 0 = 89 days ago, day 1 = 88 days ago, ..., day 89 = today
                LocalDateTime requestTime = now.minusDays(89 - day)
                    .withHour(random.nextInt(24))
                    .withMinute(random.nextInt(60))
                    .withSecond(random.nextInt(60));
                payment.setCreatedAt(requestTime);
                
                // Payment method selection
                PaymentMethod method = methods[paymentCounter % methods.length];
                payment.setPaymentMethod(method);
            
                
                // Rule 1: Validation status and card type
                String validationStatus;
                if (method == PaymentMethod.CREDIT_CARD) {
                    // For credit cards, assign actual card brand
                    payment.setCardType(cardBrands[creditCardCounter % cardBrands.length]);
                    creditCardCounter++;
                    
                    // 70% VALID, 20% INVALID, 10% PENDING for credit cards
                    double validRand = random.nextDouble();
                    if (validRand < 0.70) {
                        validationStatus = "VALID";
                    } else if (validRand < 0.90) {
                        validationStatus = "INVALID";
                    } else {
                        validationStatus = "PENDING";
                    }
                    payment.setValidationStatus(validationStatus);
                } else {
                    // For non-credit card methods, no card type
                    payment.setCardType(null);
                    
                    // 80% VALID, 15% INVALID, 5% PENDING for other methods
                    double validRand = random.nextDouble();
                    if (validRand < 0.80) {
                        validationStatus = "VALID";
                    } else if (validRand < 0.95) {
                        validationStatus = "INVALID";
                    } else {
                        validationStatus = "PENDING";
                    }
                    payment.setValidationStatus(validationStatus);
                }
                
                // Order type and other details
                payment.setOrderType(orderTypes[paymentCounter % orderTypes.length]);
                payment.setDescription("Order payment #" + paymentCounter);
                payment.setIpAddress("192.168." + (paymentCounter % 255) + "." + ((paymentCounter * 7) % 255));
                payment.setCountry(countries[paymentCounter % countries.length]);
            
                
                // Set approval amount
                Double baseAmount = payment.getAmount();
                payment.setApprovalAmount(baseAmount);
                
                // Rule 2: Only if validation_status is VALID then Approval can be success, else DECLINED
                PaymentStatus approvalStatus;
                String orderStatus;
                
                if ("VALID".equals(validationStatus)) {
                    // Rule 5: Check if approval is expired (older than 7 days)
                    long daysSinceRequest = ChronoUnit.DAYS.between(requestTime, now);
                    if (daysSinceRequest > 7 && random.nextDouble() < 0.05) { // 5% chance of expiration for old requests
                        approvalStatus = PaymentStatus.EXPIRED;
                    } else {
                        // 75% SUCCESS, 15% PROCESSING/PENDING, 5% CANCELLED, 5% FAILED
                        double rand = random.nextDouble();
                        if (rand < 0.75) {
                            approvalStatus = PaymentStatus.SUCCESS;
                        } else if (rand < 0.85) {
                            approvalStatus = (random.nextDouble() < 0.5) ? PaymentStatus.PROCESSING : PaymentStatus.PENDING;
                        } else if (rand < 0.90) {
                            approvalStatus = PaymentStatus.CANCELLED;
                        } else {
                            approvalStatus = PaymentStatus.FAILED;
                        }
                    }
                } else if ("INVALID".equals(validationStatus)) {
                    // Invalid validation always leads to DECLINED or FAILED
                    approvalStatus = (random.nextDouble() < 0.7) ? PaymentStatus.DECLINED : PaymentStatus.FAILED;
                } else { // PENDING validation
                    // Pending validation means processing or pending status
                    approvalStatus = (random.nextDouble() < 0.6) ? PaymentStatus.PROCESSING : PaymentStatus.PENDING;
                }
                
                payment.setStatus(approvalStatus);
                
                // Rule 3: Approved amount = 0 for non-success states
                if (approvalStatus == PaymentStatus.SUCCESS) {
                    // Can be partial (85-100%) or complete
                    if (random.nextDouble() < 0.85) {
                        payment.setApprovedAmount(baseAmount);
                    } else {
                        double percentage = 0.85 + (random.nextDouble() * 0.15);
                        payment.setApprovedAmount(Math.round(baseAmount * percentage * 100.0) / 100.0);
                    }
                } else {
                    // Failed, Declined, Pending, Processing, Expired, Cancelled -> 0
                    payment.setApprovedAmount(0.0);
                }
            
                
                Double approvedAmt = payment.getApprovedAmount();
                
                // Rule 6: Only if Approval is Success, process Deposit
                PaymentStatus depositStatus = null;
                if (approvalStatus == PaymentStatus.SUCCESS && approvedAmt > 0) {
                    payment.setDepositingAmount(approvedAmt);
                    
                    // 85% deposit success, 15% deposit pending/processing/failed
                    double depositRand = random.nextDouble();
                    if (depositRand < 0.85) {
                        depositStatus = PaymentStatus.SUCCESS;
                        // Rule 8: Deposited amount = full amount only for success
                        if (random.nextDouble() < 0.90) {
                            payment.setDepositedAmount(approvedAmt);
                        } else {
                            double percentage = 0.90 + (random.nextDouble() * 0.10);
                            payment.setDepositedAmount(Math.round(approvedAmt * percentage * 100.0) / 100.0);
                        }
                    } else {
                        // Deposit not successful - set deposited amount to 0
                        payment.setDepositedAmount(0.0);
                        
                        if (depositRand < 0.90) {
                            depositStatus = PaymentStatus.PENDING;
                        } else if (depositRand < 0.95) {
                            depositStatus = PaymentStatus.PROCESSING;
                        } else {
                            depositStatus = PaymentStatus.FAILED;
                        }
                        
                        // Rule 4: Reverse Approval happens when deposit is pending
                        if (depositStatus == PaymentStatus.PENDING || depositStatus == PaymentStatus.PROCESSING) {
                            payment.setReversingApprovalAmount(approvedAmt);
                            payment.setReversingApprovedAmount(approvedAmt);
                        }
                    }
                } else {
                    // No deposit if approval not successful
                    payment.setDepositingAmount(0.0);
                    payment.setDepositedAmount(0.0);
                    payment.setReversingApprovalAmount(0.0);
                    payment.setReversingApprovedAmount(0.0);
                }
                
                Double depositedAmt = payment.getDepositedAmount();
                
                // Rule 7: Only if Deposit is success, it can go for refund
                PaymentStatus refundStatus = null;
                if (depositStatus == PaymentStatus.SUCCESS && depositedAmt != null && depositedAmt > 0) {
                    // 12% chance of refund
                    if (random.nextDouble() < 0.12) {
                        payment.setRefundAmount(depositedAmt);
                        
                        // 80% full refund, 20% partial refund
                        double refundRand = random.nextDouble();
                        if (refundRand < 0.75) {
                            refundStatus = PaymentStatus.SUCCESS;
                            if (random.nextDouble() < 0.80) {
                                payment.setRefundedAmount(depositedAmt);
                            } else {
                                double percentage = 0.75 + (random.nextDouble() * 0.25);
                                payment.setRefundedAmount(Math.round(depositedAmt * percentage * 100.0) / 100.0);
                            }
                        } else {
                            // Refund pending/processing
                            refundStatus = (random.nextDouble() < 0.6) ? PaymentStatus.PENDING : PaymentStatus.PROCESSING;
                            payment.setRefundedAmount(0.0);
                        }
                        
                        // Set reversing amounts for refunds
                        payment.setReversingApprovalAmount(approvedAmt);
                        payment.setReversingApprovedAmount(approvedAmt);
                    } else {
                        payment.setRefundAmount(0.0);
                        payment.setRefundedAmount(0.0);
                    }
                } else {
                    payment.setRefundAmount(0.0);
                    payment.setRefundedAmount(0.0);
                }
                
                // Rule 9: Set order status based on the latest successful stage
                if (refundStatus == PaymentStatus.SUCCESS && payment.getRefundedAmount() != null && payment.getRefundedAmount() > 0) {
                    orderStatus = "REFUND_" + refundStatus.toString();
                } else if (refundStatus != null && refundStatus != PaymentStatus.SUCCESS) {
                    orderStatus = "REFUND_" + refundStatus.toString();
                } else if (depositStatus == PaymentStatus.SUCCESS && depositedAmt != null && depositedAmt > 0) {
                    orderStatus = "DEPOSIT_" + depositStatus.toString();
                } else if (depositStatus != null && depositStatus != PaymentStatus.SUCCESS) {
                    orderStatus = "DEPOSIT_" + depositStatus.toString();
                } else if (payment.getReversingApprovalAmount() != null && payment.getReversingApprovalAmount() > 0) {
                    orderStatus = "REVERSE_APPROVAL_PENDING";
                } else {
                    orderStatus = "APPROVAL_" + approvalStatus.toString();
                }
                
                payment.setOrderStatus(orderStatus);
                
                // Update timestamp
                payment.setUpdatedAt(requestTime.plusMinutes(random.nextInt(120)));
                
                // Set error messages based on payment status
                if (approvalStatus == PaymentStatus.FAILED) {
                    String[] failReasons = {"Insufficient funds", "Card declined by issuer", "Invalid card details", "Bank processing error", "Transaction limit exceeded"};
                    payment.setErrorMessage(failReasons[paymentCounter % failReasons.length]);
                } else if (approvalStatus == PaymentStatus.DECLINED) {
                    payment.setErrorMessage("Payment declined - validation failed");
                } else if (approvalStatus == PaymentStatus.EXPIRED) {
                    payment.setErrorMessage("Crossed 7 days");
                } else if (approvalStatus == PaymentStatus.PROCESSING) {
                    payment.setErrorMessage("Payment is being processed");
                } else if (approvalStatus == PaymentStatus.PENDING) {
                    payment.setErrorMessage("Payment is pending approval");
                } else if (approvalStatus == PaymentStatus.CANCELLED) {
                    payment.setErrorMessage("Payment cancelled by user");
                } else if (approvalStatus == PaymentStatus.SUCCESS) {
                    payment.setErrorMessage(null);
                }
                
                paymentRepository.save(payment);
                paymentCounter++;
            }
        }
        
        System.out.println("✅ Successfully generated " + (paymentCounter - 1) + " payments for 90 days!");
    }
    
    private String generateTransactionId() {
        return "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }
}
