# Payments-360

A comprehensive real-time payment monitoring and management dashboard for e-commerce applications built with **Spring Boot** backend and **React** frontend.

## 🚀 Features

### 📊 Real-time Statistics
- Total payment count and volume
- Completed transactions with total amount
- Pending transactions monitoring
- Failed transaction tracking
- Success rate calculation
- Average transaction amount

### 💳 Payment Tracking
- Complete transaction history
- Multiple payment status tracking (Pending, Processing, Completed, Failed, Refunded, Cancelled)
- Support for various payment methods (Credit Card, Debit Card, PayPal, Stripe, Bank Transfer, Apple Pay, Google Pay, Cryptocurrency)
- Customer information tracking
- Order ID association and search
- IP address and country tracking

### 🔍 Filtering & Search
- Search by Order ID from the header
- Filter by payment status
- Real-time updates

### 🎨 Modern UI
- Beautiful gradient design with "Payments 360" branding
- Responsive layout
- Interactive components with icons
- Status-coded badges
- Auto-refresh every 30 seconds

## 🛠 Technology Stack

### Backend
- **Framework**: Spring Boot 3.1.5
- **Database**: H2 (in-memory)
- **ORM**: Spring Data JPA
- **Build Tool**: Gradle 8.4
- **Java Version**: 17

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Styling**: CSS Modules

## 📁 Project Structure

```
Payments-360/
├── src/main/java/com/ecommerce/          # Backend (Spring Boot)
│   ├── Application.java                   # Main application
│   ├── controller/
│   │   └── PaymentController.java        # REST API endpoints
│   ├── model/
│   │   ├── Payment.java                  # Payment entity
│   │   ├── PaymentStatus.java            # Status enum
│   │   └── PaymentMethod.java            # Payment method enum
│   ├── repository/
│   │   └── PaymentRepository.java        # Data access layer
│   ├── service/
│   │   └── PaymentService.java           # Business logic
│   └── dto/
│       └── PaymentStatistics.java        # Statistics DTO
├── src/main/resources/
│   └── application.yml                    # Backend configuration
└── frontend/                              # Frontend (React)
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx                # Payments 360 header with search
    │   │   ├── Controls.jsx              # Control buttons & filters
    │   │   ├── StatsGrid.jsx             # Statistics cards
    │   │   ├── StatCard.jsx              # Individual stat card
    │   │   └── PaymentsTable.jsx         # Payments table
    │   ├── services/
    │   │   └── api.js                    # API service layer
    │   ├── App.jsx                       # Main app component
    │   └── main.jsx                      # React entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 🚦 Installation & Setup

### Prerequisites
- Java 17 or higher
- Node.js 16+ and npm
- (Gradle is not required - the project includes Gradle Wrapper)

### Backend Setup

1. **Navigate to project root:**
   ```bash
   cd /Users/rbasavanna/IdeaProjects/Payments-360-new
   ```

2. **Build the backend:**
   ```bash
   ./gradlew build
   ```

3. **Run the backend:**
   ```bash
   ./gradlew bootRun
   ```
   
   The backend will start at: `http://localhost:8080`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will start at: `http://localhost:3000`

4. **Access the dashboard:**
   - Open your browser and navigate to: `http://localhost:3000`

5. **Generate sample data:**
   - Click the "Generate Sample Data" button in the dashboard
   - This will create 50 sample transactions

## 🔌 API Endpoints

### REST API (Backend: http://localhost:8080)

- `GET /api/payments` - Get all payments
- `GET /api/payments/{id}` - Get payment by ID
- `GET /api/payments/status/{status}` - Get payments by status
- `GET /api/payments/recent/{hours}` - Get recent payments
- `GET /api/payments/statistics` - Get payment statistics
- `POST /api/payments` - Create new payment
- `PUT /api/payments/{id}/status` - Update payment status
- `POST /api/payments/generate-sample-data` - Generate sample data

### Example API Calls

**Create a Payment:**
```bash
curl -X POST http://localhost:8080/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "CREDIT_CARD",
    "description": "Order payment",
    "orderId": "ORD123456"
  }'
```

**Update Payment Status:**
```bash
curl -X PUT "http://localhost:8080/api/payments/1/status?status=COMPLETED"
```

**Get Statistics:**
```bash
curl http://localhost:8080/api/payments/statistics
```

## 🎯 Key Features

### Payments 360 Header
- Clean, professional "Payments 360" branding in the top left
- Order ID search bar positioned in the top center
- Responsive design that adapts to different screen sizes

### Search Functionality
- Dedicated Order ID search in the header
- Real-time filtering as you type
- Clear visual feedback

### Control Panel
- Refresh button to update data manually
- Generate Sample Data button for testing
- Status filter dropdown for quick filtering

### Statistics Dashboard
- Four key metrics displayed in beautiful cards
- Visual icons for each metric
- Color-coded values for quick identification
- Hover effects for interactivity

### Payments Table
- Comprehensive view of all transactions
- Sortable and filterable data
- Status badges with color coding
- Customer information display
- Responsive design

## 🎨 UI Customization

The dashboard uses a modern purple gradient theme. You can customize colors in the CSS files:

- **Primary Color**: `#667eea` (Purple)
- **Success Color**: `#48bb78` (Green)
- **Warning Color**: `#ed8936` (Orange)
- **Error Color**: `#f56565` (Red)

## 🔧 Configuration

### Backend Configuration (`application.yml`)
```yaml
spring:
  application:
    name: payments-360
  datasource:
    url: jdbc:h2:mem:paymentsdb
    driver-class-name: org.h2.Driver
  h2:
    console:
      enabled: true
server:
  port: 8080
```

### Frontend Configuration (`vite.config.js`)
```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop (1400px+)
- Tablet (768px - 1400px)
- Mobile (< 768px)

## 🚀 Production Build

### Backend
```bash
./gradlew clean build
java -jar build/libs/payments-360-1.0.0.jar
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## 🐛 Troubleshooting

### Backend Issues
- Ensure Java 17 is installed: `java -version`
- Check if port 8080 is available
- Rebuild if needed: `./gradlew clean build`

### Frontend Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 3000 is available
- Verify Node.js version: `node -v` (should be 16+)

### CORS Issues
- The backend is configured to allow requests from `http://localhost:3000`
- Check `application.yml` for CORS settings

## 📄 License

This project is open-source and available for educational and commercial use.

## 👥 Support

For issues, questions, or contributions, please contact the development team.

---

**Built with ❤️ using Spring Boot and React**
