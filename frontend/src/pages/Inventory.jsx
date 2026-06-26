import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { inventoryAPI, booksAPI, branchesAPI } from '../api/axios'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiAlertTriangle } from 'react-icons/fi'
import './Inventory.css'

function Inventory() {
  const { isAdmin, isManager, user } = useAuth()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [books, setBooks] = useState([])
  const [branches, setBranches] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState(null)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [formData, setFormData] = useState({
    book_id: '',
    branch_id: '',
    quantity: '',
    min_stock_level: '5'
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await inventoryAPI.getAll({
        search,
        low_stock: showLowStock ? 'true' : ''
      })
      setInventory(response.data.data)
    } catch (error) {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [search, showLowStock])

  const fetchBooks = async () => {
    try {
      const response = await booksAPI.getAll({ limit: 1000 })
      setBooks(response.data.data.books)
    } catch (error) {
      console.error('Failed to load books')
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await branchesAPI.getAll()
      setBranches(response.data.data)
    } catch (error) {
      console.error('Failed to load branches')
    }
  }

  useEffect(() => {
    fetchInventory()
    if (isAdmin) {
      fetchBooks()
      fetchBranches()
    }
  }, [fetchInventory, isAdmin])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchInventory()
  }

  const openCreateModal = () => {
    setEditingInventory(null)
    setFormData({
      book_id: '',
      branch_id: '',
      quantity: '',
      min_stock_level: '5'
    })
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingInventory(item)
    setFormData({
      book_id: item.book_id,
      branch_id: item.branch_id,
      quantity: item.quantity.toString(),
      min_stock_level: item.min_stock_level.toString()
    })
    setModalOpen(true)
  }

  const openDeleteModal = (item) => {
    setItemToDelete(item)
    setDeleteModalOpen(true)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!editingInventory && (!formData.book_id || !formData.branch_id)) {
      toast.error('Please select a book and branch')
      return
    }

    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    setSubmitting(true)
    try {
      if (editingInventory) {
        await inventoryAPI.update(editingInventory.id, {
          quantity: parseInt(formData.quantity),
          min_stock_level: parseInt(formData.min_stock_level)
        })
        toast.success('Inventory updated successfully')
      } else {
        await inventoryAPI.add({
          book_id: parseInt(formData.book_id),
          branch_id: parseInt(formData.branch_id),
          quantity: parseInt(formData.quantity),
          min_stock_level: parseInt(formData.min_stock_level)
        })
        toast.success('Inventory added successfully')
      }
      setModalOpen(false)
      fetchInventory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    setSubmitting(true)
    try {
      await inventoryAPI.delete(itemToDelete.id)
      toast.success('Inventory record deleted')
      setDeleteModalOpen(false)
      setItemToDelete(null)
      fetchInventory()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { 
      header: 'Book', 
      accessor: 'title',
      render: (value, row) => (
        <div>
          <div className="book-title">{value}</div>
          <div className="book-author">{row.author}</div>
        </div>
      )
    },
    { header: 'Branch', accessor: 'branch_name' },
    { header: 'City', accessor: 'city' },
    { 
      header: 'Quantity', 
      accessor: 'quantity',
      render: (value, row) => {
        const isLow = value <= row.min_stock_level
        return (
          <span className={`quantity-badge ${isLow ? 'low' : ''}`}>
            {isLow && <FiAlertTriangle />}
            {value}
          </span>
        )
      }
    },
    { header: 'Min Stock', accessor: 'min_stock_level' },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_, row) => {
        const canEdit = isAdmin || (isManager && row.branch_id === user?.branch_id)
        return (
          <div className="table-actions">
            {canEdit && (
              <button 
                className="action-btn edit"
                onClick={() => openEditModal(row)}
                title="Edit"
              >
                <FiEdit2 />
              </button>
            )}
            {isAdmin && (
              <button 
                className="action-btn delete"
                onClick={() => openDeleteModal(row)}
                title="Delete"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage book stock across branches</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <FiPlus /> Add Stock
          </button>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <label className="checkbox-filter">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
          />
          <span>Show Low Stock Only</span>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={inventory}
        loading={loading}
        emptyMessage="No inventory records found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingInventory ? 'Update Stock' : 'Add Book to Inventory'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          {!editingInventory ? (
            <>
              <div className="form-group">
                <label className="form-label">Book *</label>
                <select
                  name="book_id"
                  className="form-select"
                  value={formData.book_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select a book</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select
                  name="branch_id"
                  className="form-select"
                  value={formData.branch_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} - {branch.city}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="editing-info">
              <p><strong>Book:</strong> {editingInventory.title}</p>
              <p><strong>Branch:</strong> {editingInventory.branch_name}</p>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                name="quantity"
                className="form-input"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="Enter quantity"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Stock Level</label>
              <input
                type="number"
                name="min_stock_level"
                className="form-input"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                placeholder="Enter minimum stock"
                min="0"
              />
            </div>
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
              {submitting ? 'Saving...' : (editingInventory ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Inventory Record"
        size="small"
      >
        <p style={{ marginBottom: '1.5rem' }}>
          Are you sure you want to remove "<strong>{itemToDelete?.title}</strong>" 
          from <strong>{itemToDelete?.branch_name}</strong>?
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

export default Inventory
