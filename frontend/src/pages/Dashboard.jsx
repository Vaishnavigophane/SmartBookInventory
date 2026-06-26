import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'
import { inventoryAPI } from '../api/axios'
import StatsCard from '../components/StatsCard'
import { FiBook, FiMapPin, FiPackage, FiAlertTriangle } from 'react-icons/fi'
import './Dashboard.css'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await inventoryAPI.getDashboard()
      setStats(response.data.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}!</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total Books"
          value={stats?.totalBooks || 0}
          icon={FiBook}
          color="primary"
        />
        <StatsCard
          title="Total Branches"
          value={stats?.totalBranches || 0}
          icon={FiMapPin}
          color="success"
        />
        <StatsCard
          title="Total Inventory"
          value={stats?.totalInventory || 0}
          icon={FiPackage}
          color="info"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats?.lowStockCount || 0}
          icon={FiAlertTriangle}
          color="warning"
        />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2 className="card-title">Recent Inventory Updates</h2>
          <div className="recent-list">
            {stats?.recentUpdates?.length > 0 ? (
              stats.recentUpdates.map((item, index) => (
                <div key={index} className="recent-item">
                  <div className="recent-info">
                    <span className="recent-title">{item.title}</span>
                    <span className="recent-branch">{item.branch_name}</span>
                  </div>
                  <span className="recent-quantity">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))
            ) : (
              <p className="no-data">No recent updates</p>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-title">Inventory by Category</h2>
          <div className="category-list">
            {stats?.inventoryByCategory?.length > 0 ? (
              stats.inventoryByCategory.map((cat, index) => (
                <div key={index} className="category-item">
                  <span className="category-name">{cat.category}</span>
                  <div className="category-bar">
                    <div 
                      className="category-fill"
                      style={{ 
                        width: `${(cat.total / Math.max(...stats.inventoryByCategory.map(c => c.total))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="category-value">{cat.total}</span>
                </div>
              ))
            ) : (
              <p className="no-data">No category data</p>
            )}
          </div>
        </div>

        {user?.role === 'admin' && stats?.inventoryByBranch?.length > 0 && (
          <div className="dashboard-card full-width">
            <h2 className="card-title">Branch Overview</h2>
            <div className="branch-table">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>City</th>
                    <th>Books</th>
                    <th>Total Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.inventoryByBranch.map((branch, index) => (
                    <tr key={index}>
                      <td>{branch.branch_name}</td>
                      <td>{branch.city}</td>
                      <td>{branch.book_count}</td>
                      <td>{branch.total_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
