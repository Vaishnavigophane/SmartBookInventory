const { pool } = require('../db');

// Get all inventory with filters
exports.getAllInventory = async (req, res) => {
    try {
        const { branch_id, book_id, low_stock, search = '' } = req.query;
        const user = req.user;

        let query = `
            SELECT i.*, 
                   b.title, b.author, b.isbn, b.category, b.price,
                   br.branch_name, br.city
            FROM inventory i
            JOIN books b ON i.book_id = b.id
            JOIN branches br ON i.branch_id = br.id
            WHERE 1=1
        `;
        const params = [];

        // If user is manager, restrict to their branch
        if (user.role === 'manager' && user.branch_id) {
            query += ' AND i.branch_id = ?';
            params.push(user.branch_id);
        } else if (branch_id) {
            query += ' AND i.branch_id = ?';
            params.push(branch_id);
        }

        if (book_id) {
            query += ' AND i.book_id = ?';
            params.push(book_id);
        }

        if (low_stock === 'true') {
            query += ' AND i.quantity <= i.min_stock_level';
        }

        if (search) {
            query += ' AND (b.title LIKE ? OR b.author LIKE ? OR br.branch_name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY i.updated_at DESC';

        const [inventory] = await pool.query(query, params);

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Get all inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory.'
        });
    }
};

// Get inventory by ID
exports.getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const [inventory] = await pool.query(
            `SELECT i.*, 
                    b.title, b.author, b.isbn, b.category, b.price,
                    br.branch_name, br.city
             FROM inventory i
             JOIN books b ON i.book_id = b.id
             JOIN branches br ON i.branch_id = br.id
             WHERE i.id = ?`,
            [id]
        );

        if (inventory.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inventory record not found.'
            });
        }

        res.json({
            success: true,
            data: inventory[0]
        });
    } catch (error) {
        console.error('Get inventory by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory record.'
        });
    }
};

// Add book to branch inventory
exports.addToInventory = async (req, res) => {
    try {
        const { book_id, branch_id, quantity, min_stock_level = 5 } = req.body;

        // Validation
        if (!book_id || !branch_id || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Book ID, branch ID, and quantity are required.'
            });
        }

        // Check if book exists
        const [books] = await pool.query('SELECT id FROM books WHERE id = ?', [book_id]);
        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        // Check if branch exists
        const [branches] = await pool.query('SELECT id FROM branches WHERE id = ?', [branch_id]);
        if (branches.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found.'
            });
        }

        // Check if inventory record already exists
        const [existingInventory] = await pool.query(
            'SELECT id, quantity FROM inventory WHERE book_id = ? AND branch_id = ?',
            [book_id, branch_id]
        );

        let result;
        if (existingInventory.length > 0) {
            // Update existing inventory
            await pool.query(
                'UPDATE inventory SET quantity = quantity + ?, min_stock_level = ? WHERE id = ?',
                [quantity, min_stock_level, existingInventory[0].id]
            );
            result = { insertId: existingInventory[0].id };
        } else {
            // Create new inventory record
            [result] = await pool.query(
                'INSERT INTO inventory (book_id, branch_id, quantity, min_stock_level) VALUES (?, ?, ?, ?)',
                [book_id, branch_id, quantity, min_stock_level]
            );
        }

        const [newInventory] = await pool.query(
            `SELECT i.*, 
                    b.title, b.author, b.isbn,
                    br.branch_name, br.city
             FROM inventory i
             JOIN books b ON i.book_id = b.id
             JOIN branches br ON i.branch_id = br.id
             WHERE i.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: existingInventory.length > 0 
                ? 'Inventory updated successfully.' 
                : 'Book added to inventory successfully.',
            data: newInventory[0]
        });
    } catch (error) {
        console.error('Add to inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to inventory.'
        });
    }
};

// Update inventory quantity
exports.updateInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, min_stock_level } = req.body;
        const user = req.user;

        // Check if inventory exists
        const [existingInventory] = await pool.query(
            'SELECT * FROM inventory WHERE id = ?',
            [id]
        );

        if (existingInventory.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inventory record not found.'
            });
        }

        // Check branch access for managers
        if (user.role === 'manager' && user.branch_id !== existingInventory[0].branch_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update inventory for your assigned branch.'
            });
        }

        await pool.query(
            `UPDATE inventory SET 
                quantity = COALESCE(?, quantity),
                min_stock_level = COALESCE(?, min_stock_level)
             WHERE id = ?`,
            [quantity, min_stock_level, id]
        );

        const [updatedInventory] = await pool.query(
            `SELECT i.*, 
                    b.title, b.author, b.isbn,
                    br.branch_name, br.city
             FROM inventory i
             JOIN books b ON i.book_id = b.id
             JOIN branches br ON i.branch_id = br.id
             WHERE i.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Inventory updated successfully.',
            data: updatedInventory[0]
        });
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update inventory.'
        });
    }
};

// Delete inventory record
exports.deleteInventory = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingInventory] = await pool.query(
            'SELECT id FROM inventory WHERE id = ?',
            [id]
        );

        if (existingInventory.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inventory record not found.'
            });
        }

        await pool.query('DELETE FROM inventory WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Inventory record deleted successfully.'
        });
    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete inventory record.'
        });
    }
};

// Get low stock items
exports.getLowStock = async (req, res) => {
    try {
        const user = req.user;

        let query = `
            SELECT i.*, 
                   b.title, b.author, b.isbn, b.category,
                   br.branch_name, br.city
            FROM inventory i
            JOIN books b ON i.book_id = b.id
            JOIN branches br ON i.branch_id = br.id
            WHERE i.quantity <= i.min_stock_level
        `;
        const params = [];

        if (user.role === 'manager' && user.branch_id) {
            query += ' AND i.branch_id = ?';
            params.push(user.branch_id);
        }

        query += ' ORDER BY i.quantity ASC';

        const [lowStockItems] = await pool.query(query, params);

        res.json({
            success: true,
            data: lowStockItems
        });
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock items.'
        });
    }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        let branchFilter = '';
        const params = [];

        if (user.role === 'manager' && user.branch_id) {
            branchFilter = ' WHERE i.branch_id = ?';
            params.push(user.branch_id);
        }

        // Total books
        const [totalBooks] = await pool.query('SELECT COUNT(*) as count FROM books');

        // Total branches
        const [totalBranches] = await pool.query('SELECT COUNT(*) as count FROM branches');

        // Total inventory
        const [totalInventory] = await pool.query(
            `SELECT COALESCE(SUM(quantity), 0) as total FROM inventory${branchFilter}`,
            params
        );

        // Low stock count
        const [lowStockCount] = await pool.query(
            `SELECT COUNT(*) as count FROM inventory i ${branchFilter ? branchFilter + ' AND' : 'WHERE'} quantity <= min_stock_level`,
            params
        );

        // Recent inventory updates
        const [recentUpdates] = await pool.query(
            `SELECT i.*, b.title, br.branch_name
             FROM inventory i
             JOIN books b ON i.book_id = b.id
             JOIN branches br ON i.branch_id = br.id
             ${branchFilter}
             ORDER BY i.updated_at DESC
             LIMIT 5`,
            params
        );

        // Inventory by category
        const [inventoryByCategory] = await pool.query(
            `SELECT b.category, SUM(i.quantity) as total
             FROM inventory i
             JOIN books b ON i.book_id = b.id
             ${branchFilter}
             GROUP BY b.category
             ORDER BY total DESC`,
            params
        );

        // Inventory by branch (admin only)
        let inventoryByBranch = [];
        if (user.role === 'admin') {
            [inventoryByBranch] = await pool.query(
                `SELECT br.branch_name, br.city, 
                        COUNT(DISTINCT i.book_id) as book_count,
                        COALESCE(SUM(i.quantity), 0) as total_quantity
                 FROM branches br
                 LEFT JOIN inventory i ON br.id = i.branch_id
                 GROUP BY br.id
                 ORDER BY total_quantity DESC`
            );
        }

        res.json({
            success: true,
            data: {
                totalBooks: totalBooks[0].count,
                totalBranches: totalBranches[0].count,
                totalInventory: totalInventory[0].total,
                lowStockCount: lowStockCount[0].count,
                recentUpdates,
                inventoryByCategory,
                inventoryByBranch
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics.'
        });
    }
};

// Get reports
exports.getReports = async (req, res) => {
    try {
        const { type = 'total', branch_id } = req.query;
        const user = req.user;

        let data;

        switch (type) {
            case 'total':
                // Total inventory report
                let totalQuery = `
                    SELECT b.title, b.author, b.category, b.isbn,
                           SUM(i.quantity) as total_quantity,
                           COUNT(DISTINCT i.branch_id) as branch_count
                    FROM books b
                    LEFT JOIN inventory i ON b.id = i.book_id
                `;
                const totalParams = [];

                if (user.role === 'manager' && user.branch_id) {
                    totalQuery += ' WHERE i.branch_id = ?';
                    totalParams.push(user.branch_id);
                }

                totalQuery += ' GROUP BY b.id ORDER BY total_quantity DESC';
                [data] = await pool.query(totalQuery, totalParams);
                break;

            case 'branch':
                // Branch-wise report
                let branchQuery = `
                    SELECT br.branch_name, br.city, br.manager_name,
                           COUNT(DISTINCT i.book_id) as total_books,
                           COALESCE(SUM(i.quantity), 0) as total_quantity,
                           SUM(CASE WHEN i.quantity <= i.min_stock_level THEN 1 ELSE 0 END) as low_stock_items
                    FROM branches br
                    LEFT JOIN inventory i ON br.id = i.branch_id
                `;
                const branchParams = [];

                if (branch_id) {
                    branchQuery += ' WHERE br.id = ?';
                    branchParams.push(branch_id);
                } else if (user.role === 'manager' && user.branch_id) {
                    branchQuery += ' WHERE br.id = ?';
                    branchParams.push(user.branch_id);
                }

                branchQuery += ' GROUP BY br.id ORDER BY total_quantity DESC';
                [data] = await pool.query(branchQuery, branchParams);
                break;

            case 'lowstock':
                // Low stock report
                let lowStockQuery = `
                    SELECT b.title, b.author, b.category, b.isbn,
                           br.branch_name, br.city,
                           i.quantity, i.min_stock_level,
                           (i.min_stock_level - i.quantity) as shortage
                    FROM inventory i
                    JOIN books b ON i.book_id = b.id
                    JOIN branches br ON i.branch_id = br.id
                    WHERE i.quantity <= i.min_stock_level
                `;
                const lowStockParams = [];

                if (user.role === 'manager' && user.branch_id) {
                    lowStockQuery += ' AND i.branch_id = ?';
                    lowStockParams.push(user.branch_id);
                }

                lowStockQuery += ' ORDER BY shortage DESC';
                [data] = await pool.query(lowStockQuery, lowStockParams);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report type.'
                });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report.'
        });
    }
};
