const express = require('express');
const router = express.Router();
const {
  createOccupancyForecast,
  getOccupancyForecasts,
  getOccupancyForecastById,
  updateOccupancyForecast,
  deleteOccupancyForecast,
  getPropertyOccupancy,
} = require('../controllers/occupancyForecast.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createOccupancyForecast);
router.get('/', getOccupancyForecasts);
router.get('/property/:propertyId', getPropertyOccupancy);
router.get('/:id', getOccupancyForecastById);
router.put('/:id', updateOccupancyForecast);
router.delete('/:id', deleteOccupancyForecast);

module.exports = router;
