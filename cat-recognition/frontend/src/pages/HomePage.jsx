import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="page home-page">
      <div className="hero-card">
        <span className="emoji-large" aria-hidden="true">
          🐱
        </span>
        <h1>ระบบรู้จำใบหน้าแมว</h1>
        <p className="subtitle">
          ลงทะเบียนและค้นหาแมวของคุณด้วยเทคโนโลยีจดจำใบหน้า
        </p>
        <div className="btn-group">
          <Link to="/register" className="btn btn-primary">
            <span aria-hidden="true">📝</span>
            ลงทะเบียนแมว
          </Link>
          <Link to="/search" className="btn btn-secondary">
            <span aria-hidden="true">🔍</span>
            ค้นหาแมว
          </Link>
        </div>
      </div>
    </div>
  )
}
