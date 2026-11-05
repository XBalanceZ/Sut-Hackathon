import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState(() => localStorage.getItem('mockRole') || 'buyer')

  useEffect(() => {
    const syncRole = () => setRole(localStorage.getItem('mockRole') || 'buyer')
    window.addEventListener('mockRoleChanged', syncRole)
    window.addEventListener('storage', syncRole)

    return () => {
      window.removeEventListener('mockRoleChanged', syncRole)
      window.removeEventListener('storage', syncRole)
    }
  }, [])

  const roleLabel = role === 'seller' ? 'ผู้ขาย' : 'ผู้ซื้อ'
  const wallet = useMemo(() => {
    if (role === 'seller') {
      return {
        balance: 28450,
        pending: 10000,
        caption: 'รายได้พร้อมถอน',
      }
    }

    return {
      balance: 3250,
      pending: 10000,
      caption: 'เครดิตคงเหลือ',
    }
  }, [role])

  const handleSwitchAccount = () => {
    const nextRole = role === 'seller' ? 'buyer' : 'seller'
    localStorage.setItem('mockRole', nextRole)
    setRole(nextRole)
    window.dispatchEvent(new Event('mockRoleChanged'))
  }

  const handleLogout = () => {
    localStorage.removeItem('mockRole')
    localStorage.removeItem('mockUser')
    localStorage.removeItem('access_token')
    window.dispatchEvent(new Event('mockRoleChanged'))
    navigate('/login', { replace: true })
  }

  // ฟังก์ชันรองรับการกดปุ่ม (เชื่อมต่อหน้าอื่นได้ตามสะดวก)
  const handleTopUp = () => {
    alert('ระบบกำลังพาท่านไปหน้าเติมเงิน...')
    // navigate('/topup') 
  }

  const handleWithdraw = () => {
    alert('ระบบกำลังพาท่านไปหน้าถอนเงิน...')
    // navigate('/withdraw')
  }

  return (
    <MobileShell title="ตั้งค่า">
      <div className="settings-page">
        <section className="settings-profile" style={{ position: 'relative' }}>
          <div className="settings-avatar" aria-hidden="true">
            {role === 'seller' ? '🏪' : '🙂'}
          </div>
          <div style={{ flex: 1 }}>
            <p className="settings-kicker">บัญชีปัจจุบัน</p>
            <h2>{roleLabel}</h2>
            <span>{role === 'seller' ? 'Meow Paradise Store' : 'คุณใจดี รักแมว'}</span>
          </div>
          <button 
            onClick={() => navigate('/profile/edit')}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--meow-purple)', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ✏️ แก้ไข
          </button>
        </section>

        {/* ส่วนการ์ดกระเป๋าเงินที่มีปุ่มแอกชันตามสิทธิ์การใช้งาน */}
        <section className="settings-wallet-card">
          <div className="wallet-main-info">
            <div>
              <p>กระเป๋าเงิน</p>
              <strong>฿{wallet.balance.toLocaleString()}</strong>
              <span>{wallet.caption}</span>
            </div>
            
            <div className="wallet-action-box">
              {role === 'buyer' ? (
                // ผู้ซื้อ: สามารถกด "เติมเงิน" หรือ "ถอนเงิน" ก็ได้
                <div className="buyer-actions">
                  <button type="button" className="wallet-btn topup-btn" onClick={handleTopUp}>
                    ➕ เติมเงิน
                  </button>
                  <button type="button" className="wallet-btn withdraw-btn" onClick={handleWithdraw}>
                    💸 ถอนเงิน
                  </button>
                </div>
              ) : (
                // ผู้ขาย: สามารถกด "ถอนเงิน" ได้อย่างเดียว
                <button type="button" className="wallet-btn withdraw-btn" onClick={handleWithdraw}>
                  💸 ถอนเงิน
                </button>
              )}
            </div>
          </div>

          <div className="wallet-pending">
            <span>เงินพักไว้</span>
            <strong>฿{wallet.pending.toLocaleString()}</strong>
          </div>
        </section>

        <section className="settings-menu">
          <button type="button" className="settings-menu-row" onClick={handleSwitchAccount}>
            <span className="settings-menu-icon">⇄</span>
            <span>
              <strong>สลับบัญชี</strong>
              <small>เปลี่ยนเป็น{role === 'seller' ? 'ผู้ซื้อ' : 'ผู้ขาย'}</small>
            </span>
            <b>›</b>
          </button>

          <Link to="/orders" className="settings-menu-row">
            <span className="settings-menu-icon">☰</span>
            <span>
              <strong>คำสั่งซื้อ</strong>
              <small>ดูสถานะและประวัติรายการทั้งหมด</small>
            </span>
            <b>›</b>
          </Link>

          <Link to="/chat/admin" className="settings-menu-row">
            <span className="settings-menu-icon">?</span>
            <span>
              <strong>ติดต่อแอดมิน</strong>
              <small>แจ้งปัญหาการซื้อขายหรือขอความช่วยเหลือ</small>
            </span>
            <b>›</b>
          </Link>

          <Link to="/admin" className="settings-menu-row">
            <span className="settings-menu-icon">🛡️</span>
            <span>
              <strong>จัดการระบบ (Admin Only)</strong>
              <small>ควบคุม ลบ และตรวจสอบข้อมูลทั้งหมด</small>
            </span>
            <b>›</b>
          </Link>
        </section>

        <button type="button" className="settings-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <BottomNav />
    </MobileShell>
  )
}
