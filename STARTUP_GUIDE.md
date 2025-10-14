# 🚀 Quick Startup Guide - Payments 360 Dashboard

## ✅ Frontend Status
The **React frontend is now running** at: **http://localhost:3000**

## ⚠️ Backend Required
To see data in the dashboard, you need to start the Micronaut backend.

### Starting the Backend from IntelliJ IDEA:

#### Option 1: Run from IntelliJ (Recommended)
1. Open the project in **IntelliJ IDEA**
2. Navigate to: `src/main/java/com/ecommerce/Application.java`
3. Right-click on the `Application.java` file
4. Select **"Run 'Application.main()'"**
5. The backend will start on **http://localhost:8080**

#### Option 2: Use Gradle from IntelliJ
1. Open the **Gradle** panel (usually on the right side)
2. Expand **payments-360** → **Tasks** → **application**
3. Double-click on **bootRun**

#### Option 3: Use Gradle from Terminal
```bash
# Run from terminal (no installation needed - uses Gradle wrapper):
cd /Users/rbasavanna/IdeaProjects/Payments-360-new
./gradlew bootRun
```

## 🎨 Accessing the Dashboard

### Once Both Services Are Running:

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:8080/api/payments

### First Time Setup:
1. Open your browser to **http://localhost:3000**
2. You'll see the **Payments 360** dashboard with:
   - "Payments 360" header in the top left
   - "Order id" search bar in the top center
   - "Highlights" section below the header
3. Click **"Generate Sample Data"** button to populate the dashboard with 50 test transactions
4. Use the **Order ID search** to filter payments
5. Use the **Status filter** to filter by payment status

## 📊 Features You'll See:

### Header Section
- **Payments 360** branding (top left)
- **Order ID search** with label (top center)

### Highlights Section
- Bold "HIGHLIGHTS" header

### Control Panel
- Refresh button (purple)
- Generate Sample Data button (green)
- Status filter dropdown

### Statistics Cards
- Total Payments (purple)
- Completed Payments (green)
- Pending Payments (orange)
- Failed Payments (red)

### Payments Table
- Full transaction details
- Color-coded status badges
- Customer information
- Real-time updates (auto-refreshes every 30 seconds)

## 🔧 Troubleshooting

### Frontend Issues:
- **Port already in use?** Stop other apps on port 3000
- **Module errors?** Run: `cd frontend && npm install`

### Backend Issues:
- **Port 8080 in use?** Stop other services on that port
- **Compilation errors?** Ensure Java 17 is installed
- **Dependencies missing?** Run Gradle build: `./gradlew build`

## 📱 Test the Dashboard:

1. **Generate Data:** Click "Generate Sample Data"
2. **Search:** Type "ORD000001" in the Order ID search
3. **Filter:** Select "COMPLETED" from status dropdown
4. **Refresh:** Click the Refresh button to update data

---

**Happy Monitoring! 💳**

