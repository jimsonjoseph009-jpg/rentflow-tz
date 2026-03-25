# RentFlow-TZ Backend API Quick Reference

## 🚀 Base URL
```
http://localhost:5000/api
```

## 🔐 Authentication
```
Header: Authorization: Bearer <JWT_TOKEN>
```

---

## 📋 Quick Endpoint List

### 1. Tenant Ratings | `/tenant-ratings`
- `POST` Create rating
- `GET` All ratings
- `GET /:id` Get rating
- `PUT /:id` Update rating
- `DELETE /:id` Delete rating

### 2. Payment Alerts | `/payment-alerts`
- `POST` Create alert
- `GET` All alerts
- `GET /overdue` Overdue alerts
- `GET /:id` Get alert
- `PUT /:id` Update alert
- `DELETE /:id` Delete alert

### 3. Occupancy | `/occupancy`
- `POST` Create forecast
- `GET` All forecasts
- `GET /property/:id` Property occupancy
- `GET /:id` Get forecast
- `PUT /:id` Update forecast
- `DELETE /:id` Delete forecast

### 4. Utility Meters | `/utility-meters`
- `POST` Create reading
- `GET` All readings
- `GET /type/:type` By meter type
- `GET /:id` Get reading
- `PUT /:id` Update reading
- `DELETE /:id` Delete reading

### 5. Maintenance Inventory | `/maintenance-inventory`
- `POST` Create item
- `GET` All items
- `GET /low-stock` Low stock
- `GET /category/:cat` By category
- `GET /:id` Get item
- `PUT /:id` Update item
- `DELETE /:id` Delete item

### 6. Visitor Logs | `/visitor-logs`
- `POST` Create log
- `GET` All logs
- `GET /property/:id` Property logs
- `GET /:id` Get log
- `PUT /:id` Update log
- `DELETE /:id` Delete log

### 7. Tax Deductions | `/tax-deductions`
- `POST` Create deduction
- `GET` All deductions
- `GET /summary` Category summary
- `GET /summary/:year` Annual summary
- `GET /:id` Get deduction
- `PUT /:id` Update deduction
- `DELETE /:id` Delete deduction

### 8. QR Inspections | `/qr-inspections`
- `POST` Create inspection
- `GET` All inspections
- `GET /property/:id` Property inspections
- `GET /condition/:status` By condition
- `GET /:id` Get inspection
- `PUT /:id` Update inspection
- `DELETE /:id` Delete inspection

### 9. Voice Notes | `/voice-notes`
- `POST` Create note
- `GET` All notes
- `GET /category/:cat` By category
- `GET /:id` Get note
- `PUT /:id` Update note
- `DELETE /:id` Delete note

### 10. Emergency Contacts | `/emergency-contacts`
- `POST` Create contact
- `GET` All contacts
- `GET /type/:type` By type
- `GET /:id` Get contact
- `PUT /:id` Update contact
- `DELETE /:id` Delete contact

### 11. Landlord Network | `/landlord-network`
- `POST` Create member
- `GET` All members
- `GET /stats` Network stats
- `GET /:id` Get member
- `PUT /:id` Update member
- `DELETE /:id` Delete member

### 12. Pet Policies | `/pet-policies`
- `POST` Create policy
- `GET` All policies
- `GET /non-compliant` Non-compliant
- `GET /type/:type` By pet type
- `GET /:id` Get policy
- `PUT /:id` Update policy
- `DELETE /:id` Delete policy

### 13. Vehicle Management | `/vehicles`
- `POST` Create vehicle
- `GET` All vehicles
- `GET /type/:type` By vehicle type
- `GET /tenant/:id` Tenant vehicles
- `GET /:id` Get vehicle
- `PUT /:id` Update vehicle
- `DELETE /:id` Delete vehicle

### 14. Insurance/Warranty | `/insurance-warranty`
- `POST` Create record
- `GET` All records
- `GET /expiring` Expiring soon
- `GET /expired` Expired records
- `GET /type/:type` By type
- `GET /:id` Get record
- `PUT /:id` Update record
- `DELETE /:id` Delete record

### 15. Dispute Logs | `/disputes`
- `POST` Create dispute
- `GET` All disputes
- `GET /open` Open disputes
- `GET /status/:status` By status
- `GET /category/:cat` By category
- `GET /stats` Statistics
- `GET /:id` Get dispute
- `PUT /:id` Update dispute
- `DELETE /:id` Delete dispute

---

## 📝 Request/Response Examples

### Create Tenant Rating
```json
POST /tenant-ratings

{
  "tenantId": 5,
  "paymentScore": 9,
  "behaviorScore": 8,
  "reliabilityScore": 9,
  "notes": "Excellent tenant"
}

Response: {
  "id": 1,
  "landlord_id": 1,
  "tenant_id": 5,
  "payment_score": 9,
  "behavior_score": 8,
  "reliability_score": 9,
  "average_score": 8.67,
  "notes": "Excellent tenant",
  "created_at": "2026-03-05T...",
  "updated_at": "2026-03-05T..."
}
```

### Create Payment Alert
```json
POST /payment-alerts

{
  "tenantId": 3,
  "dueDate": "2026-03-15",
  "amount": 5000,
  "frequency": "monthly",
  "isEnabled": true
}
```

### Create Occupancy Forecast
```json
POST /occupancy

{
  "propertyId": 2,
  "unitId": 5,
  "leaseEndDate": "2026-06-30",
  "tenantName": "John Doe",
  "status": "OCCUPIED"
}
```

### Create Utility Meter Reading
```json
POST /utility-meters

{
  "propertyId": 1,
  "unitId": 3,
  "meterType": "ELECTRICITY",
  "reading": 2500.50,
  "readingDate": "2026-03-05",
  "cost": 125.50,
  "notes": "Monthly reading"
}
```

### Create Maintenance Inventory Item
```json
POST /maintenance-inventory

{
  "itemName": "Door Hinges",
  "category": "Hardware",
  "stock": 25,
  "minStock": 5,
  "supplier": "Local Hardware Store",
  "cost": 150,
  "notes": "Used for door repairs"
}
```

### Create Visitor Log
```json
POST /visitor-logs

{
  "propertyId": 1,
  "visitorName": "John Smith",
  "visitorPhone": "+255712345678",
  "purpose": "Plumbing inspection",
  "visitDate": "2026-03-05",
  "visitTime": "10:30",
  "notes": "Fixed leaking pipe in bathroom"
}
```

### Create Tax Deduction
```json
POST /tax-deductions

{
  "category": "Maintenance",
  "amount": 5000,
  "description": "Door repair and painting",
  "expenseDate": "2026-03-01"
}

Response includes auto-calculated:
  "tax_savings": 1500.00 (30% of amount)
```

### Create QR Inspection
```json
POST /qr-inspections

{
  "propertyId": 1,
  "qrCode": "QR123456789",
  "condition": "GOOD",
  "inspectionDate": "2026-03-05",
  "inspectionNotes": "Property in excellent condition"
}
```

### Create Voice Note
```json
POST /voice-notes

{
  "category": "Inspection",
  "audioUrl": "s3://bucket/audio-file.mp3",
  "transcription": "Property damage found in unit 3...",
  "recordDate": "2026-03-05",
  "notes": "Follow up needed"
}
```

### Create Emergency Contact
```json
POST /emergency-contacts

{
  "contactType": "Plumber",
  "contactName": "Mr. Mpiana",
  "phone": "+255712345678",
  "email": "mpiana@email.com",
  "address": "Dar es Salaam"
}
```

### Create Landlord Network Member
```json
POST /landlord-network

{
  "memberName": "Jane Landlord",
  "email": "jane@email.com",
  "phone": "+255712345678",
  "propertiesCount": 5,
  "yearsExperience": 8
}
```

### Create Pet Policy
```json
POST /pet-policies

{
  "tenantId": 4,
  "petType": "Dog",
  "petName": "Buddy",
  "isCompliant": true,
  "notes": "2kg dog, registered"
}
```

### Create Vehicle Record
```json
POST /vehicles

{
  "tenantId": 2,
  "vehicleType": "Car",
  "registrationNumber": "TZN456ABC",
  "parkingSpot": "A-15",
  "notes": "White Toyota"
}
```

### Create Insurance Record
```json
POST /insurance-warranty

{
  "propertyId": 1,
  "recordType": "Insurance",
  "provider": "AAA Insurance",
  "policyNumber": "POL123456",
  "startDate": "2024-01-01",
  "expiryDate": "2026-12-31",
  "notes": "Property fire insurance"
}
```

### Create Dispute Log
```json
POST /disputes

{
  "tenantId": 3,
  "category": "Maintenance",
  "severity": "Medium",
  "description": "Leaking roof in bedroom",
  "status": "OPEN",
  "notes": "Tenant reported on 2026-03-05"
}
```

---

## 🔄 Common Filter Routes

```
GET /tenant-ratings                     All ratings
GET /payment-alerts/overdue             Overdue only
GET /maintenance-inventory/low-stock    Items below min stock
GET /utility-meters/type/ELECTRICITY    Only electricity meters
GET /insurance-warranty/expiring        Expiring within 30 days
GET /disputes/open                      Open disputes only
GET /disputes/status/RESOLVED           Resolved disputes
GET /pet-policies/non-compliant         Non-compliant pets
```

---

## ✅ Status Values

### Occupancy Status
- `OCCUPIED` - Unit currently occupied
- `SOON` - Lease ending within 30 days
- `VACANT` - Unit is vacant

### Insurance Status
- `VALID` - Active policy
- `EXPIRING` - Within 30 days of expiry
- `EXPIRED` - Past expiry date

### Dispute Status
- `OPEN` - New dispute
- `IN_PROGRESS` - Being resolved
- `RESOLVED` - Closed

### Inspection Condition
- `GOOD` - Good condition
- `FAIR` - Average condition
- `POOR` - Needs attention

---

## 🚨 Error Responses

```json
// Unauthorized (No token)
401 {
  "message": "No token provided"
}

// Forbidden (Invalid token)
403 {
  "message": "Invalid token"
}

// Not Found
404 {
  "message": "Record not found"
}

// Server Error
500 {
  "message": "Server error"
}
```

---

## 💡 Tips

1. Always include JWT token in Authorization header
2. All POST/PUT requests need Content-Type: application/json
3. Filter routes should be called before specific ID routes
4. Use /stats endpoints for analytics/summaries
5. All data is filtered by logged-in landlord
6. Pagination available on request (implement as needed)

---

**Total Endpoints**: 60+
**Features**: 15
**Tables**: 15
**All endpoints secured with JWT authentication**
