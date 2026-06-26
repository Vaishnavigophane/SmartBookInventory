const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all branches (accessible to all authenticated users)
router.get('/', branchController.getAllBranches);
router.get('/:id', branchController.getBranchById);

// Admin only routes
router.post('/', isAdmin, branchController.createBranch);
router.put('/:id', isAdmin, branchController.updateBranch);
router.delete('/:id', isAdmin, branchController.deleteBranch);

module.exports = router;
