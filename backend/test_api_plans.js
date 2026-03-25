const { getPlans } = require('./src/controllers/plans.controller');
const httpMocks = require('node-mocks-http');

async function testGetPlans() {
  const req = httpMocks.createRequest();
  const res = httpMocks.createResponse();

  try {
    await getPlans(req, res);
    console.log('API Status:', res.statusCode);
    console.log('API Response Data:');
    console.log(JSON.stringify(res._getJSONData(), null, 2));
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

// Since getPlans uses global pool, we need to handle db connection if not already in app
// But wait, it's easier to just query the same logic.
testGetPlans();
