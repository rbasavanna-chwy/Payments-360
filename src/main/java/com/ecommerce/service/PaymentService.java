package com.ecommerce.service;

import com.ecommerce.dto.PaymentStatistics;
import com.ecommerce.model.Payment;
import com.ecommerce.model.PaymentMethod;
import com.ecommerce.model.PaymentStatus;
import com.ecommerce.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    
    @Transactional
    public void generateSampleData() {
        if (paymentRepository.count() > 0) {
            return;
        }
        
        String[] customerNames = {"John Doe", "Jane Smith", "Bob Johnson", "Alice Williams", "Charlie Brown"};
        String[] countries = {"USA", "UK", "Canada", "Australia", "Germany"};
        String[] orderTypes = {"regular", "subscription", "onetime", "cvc_no_show_penality", "loyalty", "cwav_telemedicine"};
        PaymentStatus[] statuses = PaymentStatus.values();
        PaymentMethod[] methods = PaymentMethod.values();
        
        // Generate 200 sample payments spanning 2 months (60 days)
        for (int i = 0; i < 200; i++) {
            Payment payment = new Payment();
            payment.setTransactionId(generateTransactionId());
            payment.setCustomerId("CUST" + String.format("%05d", i + 1));
            payment.setCustomerName(customerNames[i % customerNames.length]);
            payment.setCustomerEmail(payment.getCustomerName().toLowerCase().replace(" ", ".") + "@example.com");
            payment.setAmount(Math.round((Math.random() * 500 + 10) * 100.0) / 100.0);
            payment.setCurrency("USD");
            
            // Set status with higher probability of SUCCESS for more realistic data
            int statusIndex = i % statuses.length;
            if (i % 3 == 0) {
                payment.setStatus(PaymentStatus.SUCCESS); // Every 3rd transaction is SUCCESS
            } else {
                payment.setStatus(statuses[statusIndex]);
            }
            
            payment.setPaymentMethod(methods[i % methods.length]);
            payment.setOrderType(orderTypes[i % orderTypes.length]);
            payment.setCreatedAt(LocalDateTime.now().minusHours((int)(Math.random() * 1440))); // Random within last 60 days (2 months)
            payment.setDescription("Order payment #" + (i + 1));
            payment.setOrderId("ORD" + String.format("%06d", i + 1));
            payment.setIpAddress("192.168." + (i % 255) + "." + ((i * 7) % 255));
            payment.setCountry(countries[i % countries.length]);
            
            if (payment.getStatus() == PaymentStatus.FAILED) {
                payment.setErrorMessage("Insufficient funds");
            }
            
            paymentRepository.save(payment);
        }
    }
    
    private String generateTransactionId() {
        return "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }
}
