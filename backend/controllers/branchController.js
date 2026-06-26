const { pool } = require('../db');

// Get all branches
exports.getAllBranches = async (req, res) => {
    try {
        const { search = '' } = req.query;

        let query = `
            SELECT b.*, 
                   COUNT(DISTINCT i.book_id) as total_books,
                   COALESCE(SUM(i.quantity), 0) as total_inventory
            FROM branches b
            LEFT JOIN inventory i ON b.id = i.branch_id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (b.branch_name LIKE ? OR b.city LIKE ? OR b.manager_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' GROUP BY b.id ORDER BY b.created_at DESC';

        const [branches] = await pool.query(query, params);

        res.json({
            success: true,
            data: branches
        });
    } catch (error) {
        console.error('Get all branches error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch branches.'
        });
    }
};

// Get single branch by ID
exports.getBranchById = async (req, res) => {
    try {
        const { id } = req.params;

        const [branches] = await pool.query(
            `SELECT b.*, 
                    COUNT(DISTINCT i.book_id) as total_books,
                    COALESCE(SUM(i.quantity), 0) as total_inventory
             FROM branches b
             LEFT JOIN inventory i ON b.id = i.branch_id
             WHERE b.id = ?
             GROUP BY b.id`,
            [id]
        );

        if (branches.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found.'
            });
        }

        // Get inventory details for this branch
        const [inventory] = await pool.query(
            `SELECT i.*, bk.title, bk.author, bk.isbn, bk.category
             FROM inventory i
             JOIN books bk ON i.book_id = bk.id
             WHERE i.branch_id = ?
             ORDER BY bk.title`,
            [id]
        );

        // Get managers assigned to this branch
        const [managers] = await pool.query(
            `SELECT id, name, email FROM users WHERE branch_id = ? AND role = 'manager'`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...branches[0],
                inventory,
                managers
            }
        });
    } catch (error) {
        console.error('Get branch by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch branch.'
        });
    }
};

// Create new branch
exports.createBranch = async (req, res) => {
    try {
        const { branch_name, city, address, manager_name, phone, email } = req.body;

        // Validation
        if (!branch_name || !city) {
            return res.status(400).json({
                success: false,
                message: 'Branch name and city are required.'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO branches (branch_name, city, address, manager_name, phone, email) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [branch_name, city, address || null, manager_name || null, phone || null, email || null]
        );

        const [newBranch] = await pool.query(
            'SELECT * FROM branches WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Branch created successfully.',
            data: newBranch[0]
        });
    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create branch.'
        });
    }
};

// Update branch
exports.updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { branch_name, city, address, manager_name, phone, email } = req.body;

        // Check if branch exists
        const [existingBranches] = await pool.query(
            'SELECT id FROM branches WHERE id = ?',
            [id]
        );

        if (existingBranches.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found.'
            });
        }

        await pool.query(
            `UPDATE branches SET 
                branch_name = COALESCE(?, branch_name),
                city = COALESCE(?, city),
                address = COALESCE(?, address),
                manager_name = COALESCE(?, manager_name),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email)
             WHERE id = ?`,
            [branch_name, city, address, manager_name, phone, email, id]
        );

        const [updatedBranch] = await pool.query(
            'SELECT * FROM branches WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Branch updated successfully.',
            data: updatedBranch[0]
        });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update branch.'
        });
    }
};

// Delete branch
exports.deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingBranches] = await pool.query(
            'SELECT id FROM branches WHERE id = ?',
            [id]
        );

        if (existingBranches.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found.'
            });
        }

        // Check if branch has assigned users
        const [assignedUsers] = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE branch_id = ?',
            [id]
        );

        if (assignedUsers[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete branch with assigned users. Please reassign users first.'
            });
        }

        await pool.query('DELETE FROM branches WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Branch deleted successfully.'
        });
    } catch (error) {
        console.error('Delete branch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete branch.'
        });
    }
};
