const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch user from database to ensure they still exist
        const [users] = await pool.query(
            'SELECT id, name, email, role, branch_id FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Token is invalid.'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed.'
        });
    }
};

// Check if user is Admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Check if user is Admin or Manager
const isAdminOrManager = (req, res, next) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient privileges.'
        });
    }
    next();
};

// Check branch access for managers
const checkBranchAccess = (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    }
    
    const branchId = req.params.branchId || req.body.branch_id;
    
    if (req.user.role === 'manager' && req.user.branch_id) {
        if (parseInt(branchId) !== req.user.branch_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your assigned branch.'
            });
        }
    }
    
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isAdminOrManager,
    checkBranchAccess
};
