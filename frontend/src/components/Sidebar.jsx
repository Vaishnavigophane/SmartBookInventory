import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  FiHome,
  FiBook,
  FiMapPin,
  FiPackage,
  FiBarChart2,
  FiX
} from 'react-icons/fi'
import './Sidebar.css'

function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isManager, isUser } = useAuth()

  const menuItems = [
    {
      path: '/dashboard',
      icon: FiHome,
      label: 'Dashboard'
    },

    {
      path: '/books',
      icon: FiBook,
      label: 'Books'
    },

    {
      path: '/inventory',
      icon: FiPackage,
      label: 'Inventory',
      managerOnly: true
    },

    {
      path: '/branches',
      icon: FiMapPin,
      label: 'Branches',
      adminOnly: true
    },

    {
      path: '/reports',
      icon: FiBarChart2,
      label: 'Reports',
      adminOnly: true
    }
  ]

  const filteredItems = menuItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin
    }

    if (item.managerOnly) {
      return isAdmin || isManager
    }

    return true
  })

  const getRoleName = () => {
    if (isAdmin) return 'Admin'
    if (isManager) return 'Manager'
    if (isUser) return 'User'
    return 'Guest'
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FiBook className="logo-icon" />
            <span>SmartBooks</span>
          </div>

          <button className="sidebar-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <item.icon className="nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-role">
            Role: {getRoleName()}
          </div>

          <p>© 2026 SmartBooks</p>
          <p className="version">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar