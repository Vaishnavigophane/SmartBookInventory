import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { inventoryAPI, branchesAPI } from '../api/axios'
import { useAuth } from '../hooks/useAuth'
import { FiDownload, FiAlertTriangle } from 'react-icons/fi'
import './Reports.css'

function Reports() {
  const { isAdmin } = useAuth()
  const [reportType, setReportType] = useState('total')
  const [reportData, setReportData] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      fetchBranches()
    }
  }, [isAdmin])

  useEffect(() => {
    fetchReport()
  }, [reportType, selectedBranch])

  const fetchBranches = async () => {
    try {
      const response = await branchesAPI.getAll()
      setBranches(response.data.data)
    } catch (error) {
      console.error('Failed to load branches')
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await inventoryAPI.getReports({
        type: reportType,
        branch_id: selectedBranch
      })
      setReportData(response.data.data)
    } catch (error) {
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData.length) return

    const headers = Object.keys(reportData[0])
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const renderTotalReport = () => (
    <table className="report-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Category</th>
          <th>ISBN</th>
          <th>Total Quantity</th>
          <th>Branches</th>
        </tr>
      </thead>
      <tbody>
        {reportData.map((item, index) => (
          <tr key={index}>
            <td>{item.title}</td>
            <td>{item.author}</td>
            <td>{item.category}</td>
            <td>{item.isbn}</td>
            <td>{item.total_quantity || 0}</td>
            <td>{item.branch_count || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderBranchReport = () => (
    <table className="report-table">
      <thead>
        <tr>
          <th>Branch</th>
          <th>City</th>
          <th>Manager</th>
          <th>Total Books</th>
          <th>Total Stock</th>
          <th>Low Stock Items</th>
        </tr>
      </thead>
      <tbody>
        {reportData.map((item, index) => (
          <tr key={index}>
            <td>{item.branch_name}</td>
            <td>{item.city}</td>
            <td>{item.manager_name || '-'}</td>
            <td>{item.total_books}</td>
            <td>{item.total_quantity}</td>
            <td>
              {item.low_stock_items > 0 ? (
                <span className="low-stock-badge">
                  <FiAlertTriangle /> {item.low_stock_items}
                </span>
              ) : (
                <span className="good-stock-badge">0</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderLowStockReport = () => (
    <table className="report-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Branch</th>
          <th>City</th>
          <th>Current Stock</th>
          <th>Min Stock</th>
          <th>Shortage</th>
        </tr>
      </thead>
      <tbody>
        {reportData.map((item, index) => (
          <tr key={index} className="low-stock-row">
            <td>{item.title}</td>
            <td>{item.author}</td>
            <td>{item.branch_name}</td>
            <td>{item.city}</td>
            <td>{item.quantity}</td>
            <td>{item.min_stock_level}</td>
            <td className="shortage-value">{item.shortage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderReport = () => {
    if (loading) {
      return (
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Loading report...</p>
        </div>
      )
    }

    if (!reportData.length) {
      return (
        <div className="report-empty">
          <p>No data available for this report</p>
        </div>
      )
    }

    switch (reportType) {
      case 'total':
        return renderTotalReport()
      case 'branch':
        return renderBranchReport()
      case 'lowstock':
        return renderLowStockReport()
      default:
        return null
    }
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View and export inventory reports</p>
        </div>
        {reportData.length > 0 && (
          <button className="btn btn-primary" onClick={exportToCSV}>
            <FiDownload /> Export CSV
          </button>
        )}
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label className="filter-label">Report Type</label>
          <select
            className="filter-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="total">Total Inventory Report</option>
            <option value="branch">Branch-wise Report</option>
            <option value="lowstock">Low Stock Report</option>
          </select>
        </div>
        
        {isAdmin && reportType === 'branch' && (
          <div className="filter-group">
            <label className="filter-label">Branch</label>
            <select
              className="filter-select"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="report-container">
        <div className="report-header">
          <h2 className="report-title">
            {reportType === 'total' && 'Total Inventory Report'}
            {reportType === 'branch' && 'Branch-wise Report'}
            {reportType === 'lowstock' && 'Low Stock Alert Report'}
          </h2>
          <span className="report-count">
            {reportData.length} records
          </span>
        </div>
        <div className="report-content">
          {renderReport()}
        </div>
      </div>
    </div>
  )
}

export default Reports
