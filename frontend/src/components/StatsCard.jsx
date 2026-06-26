import './StatsCard.css'

function StatsCard({ title, value, icon: Icon, color = 'primary', trend }) {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-icon">
        <Icon />
      </div>
      <div className="stats-content">
        <h3 className="stats-title">{title}</h3>
        <p className="stats-value">{value}</p>
        {trend && (
          <span className={`stats-trend ${trend.type}`}>
            {trend.type === 'up' ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

export default StatsCard
