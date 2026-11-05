import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

export default function ProfileEditPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({
    name: 'คุณใจดี รักแมว',
    phone: '081-234-5678',
    email: 'jaidee@example.com',
    address: '123 ซอยแมวเหมียว เขตพญาไท กทม.',
    photo: null
  })

  const [preview, setPreview] = useState(null)

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      setProfile({ ...profile, photo: file })
    }
  }

  const handleSave = () => {
    alert('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว')
    navigate('/settings')
  }

  return (
    <MobileShell title="แก้ไขโปรไฟล์" onBack={() => navigate(-1)} noNav>
      <div style={{ padding: '16px', background: '#f8f9fa', minHeight: '100%' }}>
        <div className="meow-card" style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '16px' }}>
            {preview ? (
              <img src={preview} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--meow-purple)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--meow-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '3px solid var(--meow-purple)' }}>
                🙂
              </div>
            )}
            <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--meow-orange-deep)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              📷
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
          </div>
          <h3 style={{ margin: 0, color: 'var(--meow-text)', fontSize: '1rem' }}>เปลี่ยนรูปโปรไฟล์</h3>
        </div>

        <div className="meow-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label className="meow-label">ชื่อ - นามสกุล</label>
            <input className="meow-input" type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
          </div>
          <div>
            <label className="meow-label">เบอร์โทรศัพท์</label>
            <input className="meow-input" type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
          </div>
          <div>
            <label className="meow-label">อีเมล</label>
            <input className="meow-input" type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
          </div>
          <div>
            <label className="meow-label">ที่อยู่ (สำหรับการจัดส่ง / แสดงหน้าร้าน)</label>
            <textarea className="meow-input" rows={3} value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
          </div>
        </div>

        <button className="meow-btn meow-btn-primary" onClick={handleSave} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem' }}>
          บันทึกการแก้ไข
        </button>
      </div>
    </MobileShell>
  )
}
