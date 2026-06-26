const { pool } = require('../db');

// Get all books with pagination and search
exports.getAllBooks = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM books WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
        const params = [];
        const countParams = [];

        if (search) {
            query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
            countQuery += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            query += ' AND category = ?';
            countQuery += ' AND category = ?';
            params.push(category);
            countParams.push(category);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [books] = await pool.query(query, params);
        const [countResult] = await pool.query(countQuery, countParams);

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all books error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch books.'
        });
    }
};

// Get single book by ID
exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;

        const [books] = await pool.query(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        // Get inventory info for this book
        const [inventory] = await pool.query(
            `SELECT i.*, b.branch_name, b.city 
             FROM inventory i 
             JOIN branches b ON i.branch_id = b.id 
             WHERE i.book_id = ?`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...books[0],
                inventory
            }
        });
    } catch (error) {
        console.error('Get book by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch book.'
        });
    }
};

// Create new book
exports.createBook = async (req, res) => {
    try {
        const { title, author, category, isbn, description, price } = req.body;

        // Validation
        if (!title || !author || !category || !isbn) {
            return res.status(400).json({
                success: false,
                message: 'Title, author, category, and ISBN are required.'
            });
        }

        // Check if ISBN already exists
        const [existingBooks] = await pool.query(
            'SELECT id FROM books WHERE isbn = ?',
            [isbn]
        );

        if (existingBooks.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A book with this ISBN already exists.'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO books (title, author, category, isbn, description, price) VALUES (?, ?, ?, ?, ?, ?)',
            [title, author, category, isbn, description || null, price || 0]
        );

        const [newBook] = await pool.query(
            'SELECT * FROM books WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Book created successfully.',
            data: newBook[0]
        });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create book.'
        });
    }
};

// Update book
exports.updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, category, isbn, description, price } = req.body;

        // Check if book exists
        const [existingBooks] = await pool.query(
            'SELECT id FROM books WHERE id = ?',
            [id]
        );

        if (existingBooks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        // Check if ISBN is being changed and if it conflicts
        if (isbn) {
            const [duplicateISBN] = await pool.query(
                'SELECT id FROM books WHERE isbn = ? AND id != ?',
                [isbn, id]
            );

            if (duplicateISBN.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'A book with this ISBN already exists.'
                });
            }
        }

        await pool.query(
            `UPDATE books SET 
                title = COALESCE(?, title),
                author = COALESCE(?, author),
                category = COALESCE(?, category),
                isbn = COALESCE(?, isbn),
                description = COALESCE(?, description),
                price = COALESCE(?, price)
             WHERE id = ?`,
            [title, author, category, isbn, description, price, id]
        );

        const [updatedBook] = await pool.query(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Book updated successfully.',
            data: updatedBook[0]
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update book.'
        });
    }
};

// Delete book
exports.deleteBook = async (req, res) => {
    try {
        const { id } = req.params;

        const [existingBooks] = await pool.query(
            'SELECT id FROM books WHERE id = ?',
            [id]
        );

        if (existingBooks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        await pool.query('DELETE FROM books WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Book deleted successfully.'
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete book.'
        });
    }
};

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query(
            'SELECT DISTINCT category FROM books ORDER BY category'
        );

        res.json({
            success: true,
            data: categories.map(c => c.category)
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories.'
        });
    }
};
