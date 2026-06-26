const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Dashboard and reports (accessible to all authenticated users)
router.get('/dashboard', inventoryController.getDashboardStats);
router.get('/reports', inventoryController.getReports);
router.get('/low-stock', inventoryController.getLowStock);

// Inventory management
router.get('/', inventoryController.getAllInventory);
router.get('/:id', inventoryController.getInventoryById);

// Add to inventory (admin only)
router.post('/', isAdmin, inventoryController.addToInventory);

// Update inventory (admin and manager)
router.put('/:id', isAdminOrManager, inventoryController.updateInventory);

// Delete inventory (admin only)
router.delete('/:id', isAdmin, inventoryController.deleteInventory);

module.exports = router;
