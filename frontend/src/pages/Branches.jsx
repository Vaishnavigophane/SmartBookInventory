import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { branchesAPI } from '../api/axios'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'
import './Branches.css'

function Branches() {
  const { isAdmin } = useAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [branchToDelete, setBranchToDelete] = useState(null)
  const [formData, setFormData] = useState({
    branch_name: '',
    city: '',
    address: '',
    manager_name: '',
    phone: '',
    email: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const response = await branchesAPI.getAll({ search })
      setBranches(response.data.data)
    } catch (error) {
      toast.error('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBranches()
  }

  const openCreateModal = () => {
    setEditingBranch(null)
    setFormData({
      branch_name: '',
      city: '',
      address: '',
      manager_name: '',
      phone: '',
      email: ''
    })
    setModalOpen(true)
  }

  const openEditModal = (branch) => {
    setEditingBranch(branch)
    setFormData({
      branch_name: branch.branch_name,
      city: branch.city,
      address: branch.address || '',
      manager_name: branch.manager_name || '',
      phone: branch.phone || '',
      email: branch.email || ''
    })
    setModalOpen(true)
  }

  const openDeleteModal = (branch) => {
    setBranchToDelete(branch)
    setDeleteModalOpen(true)
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.branch_name || !formData.city) {
      toast.error('Branch name and city are required')
      return
    }

    setSubmitting(true)
    try {
      if (editingBranch) {
        await branchesAPI.update(editingBranch.id, formData)
        toast.success('Branch updated successfully')
      } else {
        await branchesAPI.create(formData)
        toast.success('Branch created successfully')
      }
      setModalOpen(false)
      fetchBranches()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!branchToDelete) return

    setSubmitting(true)
    try {
      await branchesAPI.delete(branchToDelete.id)
      toast.success('Branch deleted successfully')
      setDeleteModalOpen(false)
      setBranchToDelete(null)
      fetchBranches()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete branch')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { header: 'Branch Name', accessor: 'branch_name' },
    { header: 'City', accessor: 'city' },
    { header: 'Manager', accessor: 'manager_name', render: (value) => value || '-' },
    { header: 'Phone', accessor: 'phone', render: (value) => value || '-' },
    { 
      header: 'Books', 
      accessor: 'total_books',
      render: (value) => value || 0
    },
    { 
      header: 'Inventory', 
      accessor: 'total_inventory',
      render: (value) => value || 0
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
    <div className="branches-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage branch locations</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <FiPlus /> Add Branch
          </button>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={branches}
        loading={loading}
        emptyMessage="No branches found"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Branch Name *</label>
              <input
                type="text"
                name="branch_name"
                className="form-input"
                value={formData.branch_name}
                onChange={handleInputChange}
                placeholder="Enter branch name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                className="form-input"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Enter city"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              name="address"
              className="form-textarea"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
              rows="2"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Manager Name</label>
              <input
                type="text"
                name="manager_name"
                className="form-input"
                value={formData.manager_name}
                onChange={handleInputChange}
                placeholder="Enter manager name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
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
              {submitting ? 'Saving...' : (editingBranch ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Branch"
        size="small"
      >
        <p style={{ marginBottom: '1.5rem' }}>
          Are you sure you want to delete "<strong>{branchToDelete?.branch_name}</strong>"? 
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

export default Branches
