import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { booksAPI } from '../api/axios'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'
import './Books.css'

function Books() {
  const { isAdmin } = useAuth()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    isbn: '',
    description: '',
    price: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchBooks = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const response = await booksAPI.getAll({
        page,
        limit: 10,
        search,
        category: selectedCategory
      })
      setBooks(response.data.data.books)
      setPagination(response.data.data.pagination)
    } catch (error) {
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await booksAPI.getCategories()
      setCategories(response.data.data)
    } catch (error) {
      console.error('Failed to load categories')
    }
  }

  useEffect(() => {
    fetchBooks()
    fetchCategories()
  }, [fetchBooks])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBooks(1)
  }

  const openCreateModal = () => {
    setEditingBook(null)
    setFormData({
      title: '',
      author: '',
      category: '',
      isbn: '',
      description: '',
      price: ''
    })
    setModalOpen(true)
  }

  const openEditModal = (book) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      description: book.description || '',
      price: book.price || ''
    })
    setModalOpen(true)
  }

  const openDeleteModal = (book) => {
    setBookToDelete(book)
    setDeleteModalOpen(true)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.author || !formData.category || !formData.isbn) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      if (editingBook) {
        await booksAPI.update(editingBook.id, formData)
        toast.success('Book updated successfully')
      } else {
        await booksAPI.create(formData)
        toast.success('Book created successfully')
      }
      setModalOpen(false)
      fetchBooks(pagination?.currentPage || 1)
      fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!bookToDelete) return

    setSubmitting(true)
    try {
      await booksAPI.delete(bookToDelete.id)
      toast.success('Book deleted successfully')
      setDeleteModalOpen(false)
      setBookToDelete(null)
      fetchBooks(pagination?.currentPage || 1)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete book')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Author', accessor: 'author' },
    { header: 'Category', accessor: 'category' },
    { header: 'ISBN', accessor: 'isbn' },
    { 
      header: 'Price', 
      accessor: 'price',
      render: (value) => `₹${parseFloat(value || 0).toFixed(2)}`
    },
    ...(isAdmin ? [{
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => (
        <div className="table-actions">
          <button 
            className="action-btn edit"
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <FiEdit2 />
          </button>
          <button 
            className="action-btn delete"
            onClick={() => openDeleteModal(row)}
            title="Delete"
          >
            <FiTrash2 />
          </button>
        </div>
      )
    }] : [])
  ]

  return (
    <div className="books-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Books</h1>
          <p className="page-subtitle">Manage your book catalog</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <FiPlus /> Add Book
          </button>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search books..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={books}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchBooks}
        emptyMessage="No books found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBook ? 'Edit Book' : 'Add New Book'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter book title"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Author *</label>
              <input
                type="text"
                name="author"
                className="form-input"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Enter author name"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <input
                type="text"
                name="category"
                className="form-input"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Programming"
              />
            </div>
            <div className="form-group">
              <label className="form-label">ISBN *</label>
              <input
                type="text"
                name="isbn"
                className="form-input"
                value={formData.isbn}
                onChange={handleInputChange}
                placeholder="Enter ISBN"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹)</label>
            <input
              type="number"
              name="price"
              className="form-input"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="Enter price"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-textarea"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter book description"
              rows="3"
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (editingBook ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Book"
        size="small"
      >
        <p style={{ marginBottom: '1.5rem' }}>
          Are you sure you want to delete "<strong>{bookToDelete?.title}</strong>"? 
          This action cannot be undone.
        </p>
        <div className="form-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </button>
          <button 
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default Books
