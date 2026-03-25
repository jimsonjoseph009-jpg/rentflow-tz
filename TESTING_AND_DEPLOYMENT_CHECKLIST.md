# RentFlow-TZ Backend - Testing & Deployment Checklist

## ✅ Pre-Deployment Checklist

### Database Setup
- [ ] PostgreSQL installed and running
- [ ] Database `rentflow_tz` created
- [ ] User has CREATE TABLE permissions
- [ ] Run: `psql -U postgres -d rentflow_tz -f DATABASE_SCHEMA_15_FEATURES.sql`
- [ ] Verify all 15 tables created successfully
- [ ] Verify indexes created
- [ ] Check foreign key relationships

### Backend Setup
- [ ] Node.js v14+ installed
- [ ] npm dependencies installed: `npm install`
- [ ] `.env` file configured with:
  - `DATABASE_URL=postgresql://user:pass@localhost:5432/rentflow_tz`
  - `JWT_SECRET=your_secret_key`
  - `PORT=5000`
  - `NODE_ENV=development`
- [ ] All controller files present (15 files)
- [ ] All route files present (15 files)
- [ ] app.js updated with 15 new routes
- [ ] Server starts without errors: `npm start`

### Code Quality
- [ ] No console errors on startup
- [ ] No missing module imports
- [ ] Middleware properly configured
- [ ] Database connection successful
- [ ] All routes registered
- [ ] Authentication middleware applied to all new routes

---

## 🧪 Testing Checklist

### Unit Testing (Controllers)

#### Tenant Rating Feature
- [ ] POST /api/tenant-ratings - Create rating
  - Test with valid tenant ID
  - Test score calculation (0-10)
  - Test average score calculation
  - Verify landlord_id isolation
- [ ] GET /api/tenant-ratings - Get all ratings
  - Verify returns user's ratings only
  - Check pagination (if implemented)
- [ ] GET /api/tenant-ratings/:id - Get specific rating
  - Test with valid ID
  - Test with invalid ID (404)
  - Test unauthorized access (401)
- [ ] PUT /api/tenant-ratings/:id - Update rating
  - Test valid update
  - Test invalid data (validation)
  - Test unauthorized (403)
- [ ] DELETE /api/tenant-ratings/:id - Delete rating
  - Test successful deletion
  - Test delete non-existent (404)
  - Verify cascade delete behavior

#### Payment Alerts Feature
- [ ] POST /api/payment-alerts - Create alert
- [ ] GET /api/payment-alerts - Get all alerts
- [ ] GET /api/payment-alerts/overdue - Get overdue only
  - Verify date comparison logic
  - Test with past dates
  - Test with future dates
- [ ] GET /api/payment-alerts/:id - Get specific alert
- [ ] PUT /api/payment-alerts/:id - Update alert
- [ ] DELETE /api/payment-alerts/:id - Delete alert

#### Occupancy Forecast Feature
- [ ] POST /api/occupancy - Create forecast
- [ ] GET /api/occupancy - Get all forecasts
- [ ] GET /api/occupancy/property/:id - Get property occupancy
  - Verify status aggregation
  - Test with multiple units
- [ ] GET /api/occupancy/:id - Get specific forecast
- [ ] PUT /api/occupancy/:id - Update forecast
  - Test status change (OCCUPIED -> SOON -> VACANT)
- [ ] DELETE /api/occupancy/:id - Delete forecast

#### Utility Meters Feature
- [ ] POST /api/utility-meters - Create reading
- [ ] GET /api/utility-meters - Get all readings
- [ ] GET /api/utility-meters/type/:type - Filter by type
  - Test with ELECTRICITY
  - Test with WATER
  - Test with GAS
- [ ] GET /api/utility-meters/:id - Get specific reading
- [ ] PUT /api/utility-meters/:id - Update reading
- [ ] DELETE /api/utility-meters/:id - Delete reading

#### Maintenance Inventory Feature
- [ ] POST /api/maintenance-inventory - Create item
- [ ] GET /api/maintenance-inventory - Get all items
- [ ] GET /api/maintenance-inventory/low-stock - Get low stock
  - Verify threshold logic (stock <= min_stock)
  - Test with various stock levels
- [ ] GET /api/maintenance-inventory/category/:cat - Filter by category
- [ ] GET /api/maintenance-inventory/:id - Get specific item
- [ ] PUT /api/maintenance-inventory/:id - Update item
- [ ] DELETE /api/maintenance-inventory/:id - Delete item

#### Visitor Log Feature
- [ ] POST /api/visitor-logs - Create log entry
- [ ] GET /api/visitor-logs - Get all logs
- [ ] GET /api/visitor-logs/property/:id - Get property visitors
  - Test with multiple visitors
  - Verify date sorting
- [ ] GET /api/visitor-logs/:id - Get specific log
- [ ] PUT /api/visitor-logs/:id - Update log
- [ ] DELETE /api/visitor-logs/:id - Delete log

#### Tax Deductions Feature
- [ ] POST /api/tax-deductions - Create deduction
  - Verify auto tax savings (30% calc)
  - Test with various amounts
- [ ] GET /api/tax-deductions - Get all deductions
- [ ] GET /api/tax-deductions/summary - Get category summary
  - Verify SUM by category
  - Test aggregation logic
- [ ] GET /api/tax-deductions/summary/:year - Get annual summary
  - Test year extraction from date
  - Test different years
- [ ] GET /api/tax-deductions/:id - Get specific deduction
- [ ] PUT /api/tax-deductions/:id - Update deduction
- [ ] DELETE /api/tax-deductions/:id - Delete deduction

#### QR Inspections Feature
- [ ] POST /api/qr-inspections - Create inspection
- [ ] GET /api/qr-inspections - Get all inspections
- [ ] GET /api/qr-inspections/property/:id - Get property inspections
- [ ] GET /api/qr-inspections/condition/:status - Filter by condition
  - Test GOOD, FAIR, POOR
- [ ] GET /api/qr-inspections/:id - Get specific inspection
- [ ] PUT /api/qr-inspections/:id - Update inspection
- [ ] DELETE /api/qr-inspections/:id - Delete inspection

#### Voice Notes Feature
- [ ] POST /api/voice-notes - Create note
- [ ] GET /api/voice-notes - Get all notes
- [ ] GET /api/voice-notes/category/:cat - Filter by category
- [ ] GET /api/voice-notes/:id - Get specific note
- [ ] PUT /api/voice-notes/:id - Update note
- [ ] DELETE /api/voice-notes/:id - Delete note

#### Emergency Contacts Feature
- [ ] POST /api/emergency-contacts - Create contact
- [ ] GET /api/emergency-contacts - Get all contacts
- [ ] GET /api/emergency-contacts/type/:type - Filter by type
  - Test all 9 contact types
- [ ] GET /api/emergency-contacts/:id - Get specific contact
- [ ] PUT /api/emergency-contacts/:id - Update contact
- [ ] DELETE /api/emergency-contacts/:id - Delete contact

#### Landlord Network Feature
- [ ] POST /api/landlord-network - Create member
- [ ] GET /api/landlord-network - Get all members
- [ ] GET /api/landlord-network/stats - Get statistics
  - Verify COUNT, AVG calculations
- [ ] GET /api/landlord-network/:id - Get specific member
- [ ] PUT /api/landlord-network/:id - Update member
- [ ] DELETE /api/landlord-network/:id - Delete member

#### Pet Policy Feature
- [ ] POST /api/pet-policies - Create policy
- [ ] GET /api/pet-policies - Get all policies
- [ ] GET /api/pet-policies/non-compliant - Get non-compliant
  - Test is_compliant flag
- [ ] GET /api/pet-policies/type/:type - Filter by pet type
  - Test all 5 pet types
- [ ] GET /api/pet-policies/:id - Get specific policy
- [ ] PUT /api/pet-policies/:id - Update policy
- [ ] DELETE /api/pet-policies/:id - Delete policy

#### Vehicle Management Feature
- [ ] POST /api/vehicles - Create vehicle
  - Test uppercase conversion for registration
- [ ] GET /api/vehicles - Get all vehicles
- [ ] GET /api/vehicles/type/:type - Filter by vehicle type
  - Test all 5 vehicle types
- [ ] GET /api/vehicles/tenant/:id - Get tenant vehicles
- [ ] GET /api/vehicles/:id - Get specific vehicle
- [ ] PUT /api/vehicles/:id - Update vehicle
  - Test registration uppercase
- [ ] DELETE /api/vehicles/:id - Delete vehicle

#### Insurance/Warranty Feature
- [ ] POST /api/insurance-warranty - Create record
- [ ] GET /api/insurance-warranty - Get all records
- [ ] GET /api/insurance-warranty/expiring - Get expiring (30 days)
  - Test date comparison logic
- [ ] GET /api/insurance-warranty/expired - Get expired records
  - Test past date detection
- [ ] GET /api/insurance-warranty/type/:type - Filter by type
  - Test Insurance, Warranty, License
- [ ] GET /api/insurance-warranty/:id - Get specific record
- [ ] PUT /api/insurance-warranty/:id - Update record
- [ ] DELETE /api/insurance-warranty/:id - Delete record

#### Dispute Log Feature
- [ ] POST /api/disputes - Create dispute
- [ ] GET /api/disputes - Get all disputes
- [ ] GET /api/disputes/open - Get open disputes
  - Test status filtering (OPEN, IN_PROGRESS, RESOLVED)
- [ ] GET /api/disputes/status/:status - Filter by status
- [ ] GET /api/disputes/category/:cat - Filter by category
  - Test all 5 categories
- [ ] GET /api/disputes/stats - Get statistics
  - Verify COUNT by status
- [ ] GET /api/disputes/:id - Get specific dispute
- [ ] PUT /api/disputes/:id - Update dispute
- [ ] DELETE /api/disputes/:id - Delete dispute

### Authentication Testing
- [ ] Request without token → 401 error
- [ ] Request with invalid token → 403 error
- [ ] Request with expired token → 403 error
- [ ] Request with valid token → 200 success
- [ ] Request as wrong role (tenant instead of landlord) → 403 error

### Multi-Tenancy Testing
- [ ] Landlord A cannot see Landlord B's data
- [ ] Filters work correctly by landlord_id
- [ ] All queries respect landlord_id isolation
- [ ] Delete operations respect landlord_id

### Error Handling Testing
- [ ] Invalid input data → 400 error
- [ ] Missing required fields → 400 error
- [ ] Database error → 500 error with safe message
- [ ] Not found scenarios → 404 error

### Performance Testing
- [ ] GET with 1000+ records → Reasonable response time
- [ ] Index queries use indexes (check EXPLAIN PLAN)
- [ ] Complex filters perform well
- [ ] Pagination works (if implemented)

---

## 🔗 Integration Testing

### Frontend to Backend
- [ ] Frontend can connect to backend API
- [ ] JWT tokens properly sent in headers
- [ ] Data saves to backend successfully
- [ ] Data retrieves from backend correctly
- [ ] Updates reflect immediately
- [ ] Deletes remove data properly

### Full Feature Flow
- [ ] Create → Read → Update → Delete cycle works
- [ ] Data persists across sessions
- [ ] Multi-user scenarios work correctly
- [ ] Real-time updates (if applicable)

---

## 📊 Load Testing (Optional)

- [ ] 100 concurrent users
- [ ] 1000 records per table
- [ ] Complex queries with filters
- [ ] Large file uploads (audio, images)
- [ ] Response time < 500ms for most endpoints

---

## 🚀 Deployment Testing

### Staging Environment
- [ ] Code deployed successfully
- [ ] Environment variables correct
- [ ] Database connection successful
- [ ] All endpoints functional
- [ ] CORS configured properly
- [ ] SSL/HTTPS enabled
- [ ] Logging working
- [ ] Error monitoring active

### Production Environment
- [ ] Code deployed successfully
- [ ] Environment variables set
- [ ] Database backed up
- [ ] API keys secured
- [ ] Rate limiting configured
- [ ] Monitoring enabled
- [ ] Alert thresholds set
- [ ] Rollback plan ready

---

## 📋 Post-Deployment

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify data integrity
- [ ] User acceptance testing
- [ ] Document any issues
- [ ] Create incident response plan
- [ ] Schedule regular backups
- [ ] Plan feature enhancements

---

## 🎯 Success Criteria

✅ All 60+ endpoints tested and working
✅ No errors in production logs
✅ Response times under 500ms
✅ All users can access their data
✅ No cross-tenant data leakage
✅ Error messages helpful but secure
✅ Database indexes performing well
✅ Authentication working on all routes

---

## 📞 Support Information

**Documentation**:
- BACKEND_IMPLEMENTATION_COMPLETE.md
- API_QUICK_REFERENCE.md
- DATABASE_SCHEMA_15_FEATURES.sql

**Testing Tools**:
- Postman (API testing)
- Thunder Client (VS Code)
- cURL (command line)
- pgAdmin (database management)

**Monitoring**:
- Server logs
- Database logs
- Error tracking service
- Performance monitoring

---

**Ready for Testing & Deployment! 🚀**
