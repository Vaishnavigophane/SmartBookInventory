import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function AdminRoute({ children }) {
  const { isAdmin } = useAuth()

  return isAdmin
    ? children
    : <Navigate to="/dashboard" replace />
}

export default AdminRoute