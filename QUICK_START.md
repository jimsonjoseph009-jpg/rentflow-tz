# 🚀 Quick Start Guide - RentFlow-TZ Features

## Starting Your Application

### 1. Start Backend Server
```bash
cd /home/j-walker/Desktop/rentflow-tz/backend
npm install  # If not already installed
node server.js
# Server runs on http://localhost:5000
```

### 2. Start Frontend Server
```bash
cd /home/j-walker/Desktop/rentflow-tz/frontend
npm install  # If not already installed
npm start
# Frontend runs on http://localhost:3000
```

### 3. Access the Application
Open your browser and go to: **http://localhost:3000**

---

## 📱 Navigation Guide

### Main Navigation Links (Top Navbar)

**Primary Links (Always Visible):**
- 📊 **Dashboard** - Overview of your properties and statistics
- 🏠 **Properties** - Manage your rental properties
- 🏢 **Units** - Manage individual units within properties
- 👥 **Tenants** - Manage tenant information
- 💰 **Payments** - Track payment transactions

**Secondary Links (Click "More ▼" dropdown):**
- 📈 **Analytics** - View charts, reports, and insights
- 💸 **Financial** - Track expenses by category
- 🔧 **Maintenance** - Create and track maintenance requests
- 📸 **Media** - Upload and manage property photos/documents
- 📧 **Email** - Email templates and integration
- 👤 **Profile** - View/edit profile and change password

### Theme & Logout
- 🌙 **Dark/Light Toggle** - Switch between dark and light themes
- 🚪 **Logout** - Sign out of your account

---

## 🎯 Feature Quick Reference

### Feature 1: Search & Filter
**Pages:** Properties, Units, Tenants, Payments
- Type to search by name, address, or contact info
- Use status dropdowns to filter results
- Results update in real-time

### Feature 2: Responsive Design
- Works on desktop, tablet, and mobile
- Touch-friendly buttons and forms
- Automatic layout adjustments

### Feature 3: Dark Mode
- Click 🌙 **Dark** or ☀️ **Light** button to toggle
- Your preference is saved automatically
- All pages support both themes

### Feature 4: Analytics & Reports
**Path:** `/analytics`
```
What you can see:
- Total properties, units, and occupancy rate
- Monthly income statistics
- Unit status distribution
- Property-wise unit breakdown
- Quick insights about your business
```

### Feature 5: User Profile & Settings
**Path:** `/profile`
```
Profile Management:
- View your information
- Click "Edit" to update name, email, phone
- Change password with security validation
- Click "Logout" to exit

Password Change Requirements:
- Current password (for verification)
- New password (minimum 6 characters)
- Confirm new password
```

### Feature 6: Notifications & Reminders
- Toast notifications appear in top-right
- Auto-dismiss after 4 seconds
- Manual close with ✕ button
- Success (green), Error (red), Warning (orange), Info (blue)

### Feature 7: Financial Tracking
**Path:** `/financial`
```
Track Expenses:
1. Click "+ Add Expense"
2. Fill in:
   - Description (what was spent)
   - Amount (in TZS)
   - Category (maintenance, utilities, etc.)
   - Date

View Analytics:
- Total expenses summary
- Expenses this month
- Breakdown by category
- Recent expenses list
```

### Feature 8: Property Media Gallery
**Path:** `/media`
```
Upload Files:
1. Select a property from dropdown
2. Choose file type (photo/document)
3. Select file from your computer
4. Click "Upload File"

Manage Files:
- View uploaded photos and documents
- Download any file
- Delete files you no longer need
- See upload dates and file sizes
```

### Feature 9: Maintenance Tracker
**Path:** `/maintenance`
```
Create Request:
1. Click "+ New Request"
2. Select property and optional unit
3. Describe the maintenance issue
4. Set priority (low/medium/high)
5. Set status and budget
6. Click "Create Maintenance Request"

Track Progress:
- View all requests in table
- Change status from pending → in-progress → completed
- Search by property or description
- Filter by status
- Delete completed requests
```

### Feature 10: Email Integration
**Path:** `/email`
```
Send Templated Emails:
1. Select email template (5 available)
2. Fill recipient info:
   - Email address (required)
   - Name and other fields per template
3. Review preview on right side
4. Click "Send Email"

Available Templates:
- Rent Payment Reminder
- Payment Receipt
- Lease Expiration Notice
- Maintenance Request Notification
- Welcome Email
```

---

## 🔑 Test Login Credentials

After database is set up, use:
```
Email: test@example.com
Password: (Set during setup)
```

Or create new account via **Register** page

---

## 🛠️ Troubleshooting

### Issue: "User not found" on login
**Solution:** Database not set up. See backend README or run:
```bash
cd backend
# Follow database setup instructions
```

### Issue: Pages showing "Loading..." forever
**Solution:** Backend server not running. Start it:
```bash
cd backend
node server.js
```

### Issue: Images not loading in media gallery
**Solution:** This is normal - localStorage stores base64. Works once you upload files.

### Issue: Dark mode not saving
**Solution:** Clear localStorage:
```javascript
// In browser console
localStorage.clear()
// Reload page
```

---

## 📊 Dashboard Statistics Explained

| Metric | Meaning |
|--------|---------|
| Total Properties | Number of properties you manage |
| Total Units | Total rental units across all properties |
| Occupancy Rate | % of units currently occupied |
| Monthly Income | Total rent collected this month |
| Income per Unit | Average monthly income per unit |

---

## 💡 Tips & Tricks

1. **Search Across Pages:** Use search boxes to quickly find properties, units, or tenants

2. **Filter Payments:** Filter by status (pending/completed/failed) to manage collections

3. **Dark Mode for Night:** Toggle dark mode for comfortable late-night use

4. **Expense Categories:** Use consistent categories for better financial tracking

5. **Maintenance Budget:** Set realistic budgets for maintenance planning

6. **Email Templates:** Customize email content for your tenants

7. **Media Organization:** Upload property photos when first adding properties

8. **Regular Backups:** Export important data periodically

---

## 🚀 Next Steps

1. **Set up your properties** in the Properties section
2. **Add units** to each property
3. **Register tenants** and assign units
4. **Track payments** in the Payments section
5. **Monitor analytics** in the Analytics dashboard
6. **Use email** to communicate with tenants
7. **Track maintenance** as issues arise
8. **Monitor finances** for profitability

---

## 📞 Support Resources

### Common Tasks

**Add New Property:**
1. Properties → "+ Add Property"
2. Fill property name and address
3. Click "Add" button

**Assign Tenant to Unit:**
1. Units → "+ Add Unit"
2. Select property
3. Select tenant to assign
4. Set occupancy status

**Record Payment:**
1. Payments → "+ Add Payment"
2. Select tenant
3. Enter amount and date
4. Set status
5. Click "Add"

**View Income Report:**
1. Analytics page
2. Scroll down to view charts
3. See "Income per Unit" calculation

---

## ⚙️ Settings

### Theme Preference
Saved in browser localStorage under `theme` key

### User Profile
- Name, Email, Phone stored in database
- Password stored securely (hashed)

### Expenses
Currently stored in browser localStorage
Ready to migrate to database

---

## 📈 Business Metrics

Monitor these KPIs in Analytics:

1. **Occupancy Rate** - Higher is better (target: 95%+)
2. **Monthly Income** - Revenue from rent
3. **Expense Ratio** - (Total Expenses / Income) × 100
4. **Units per Property** - Diversity metric
5. **Income per Unit** - Profitability metric

---

## 🎨 Customization Tips

Want to customize colors?
Edit the color values in each page:
```javascript
// Example from Analytics.jsx
const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
// Change #f5f5f5 to your preferred light background color
```

---

## ✅ Feature Completion Checklist

As you use RentFlow-TZ:
- [ ] Set up all properties
- [ ] Add units to properties
- [ ] Register all tenants
- [ ] Record historical payments
- [ ] Upload property photos
- [ ] Set up maintenance requests
- [ ] Track expenses
- [ ] Review analytics dashboard
- [ ] Send first email to tenant
- [ ] Update profile information

---

**RentFlow-TZ is ready to use!** 🎉

Start by logging in or registering a new account, then begin managing your properties efficiently.

Last Updated: Today
Version: 1.0.0
Status: Production Ready ✅
