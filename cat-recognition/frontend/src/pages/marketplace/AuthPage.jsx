import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

const API_BASE = 'http://localhost:8000'

const fakeProfiles = {
  buyer: {
    role: 'buyer',
    label: 'ผู้ซื้อ',
    name: 'คุณใจดี รักแมว',
    email: 'buyer@meowmatch.local',
    phone: '0812345678',
    homePath: '/',
  },
  seller: {
    role: 'seller',
    label: 'ผู้ขาย',
    name: 'Meow Paradise Store',
    email: 'seller@meowmatch.local',
    phone: '0898765432',
    homePath: '/sell-dashboard',
  },
}

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const [selectedRole, setSelectedRole] = useState('buyer')
  const selectedProfile = fakeProfiles[selectedRole]
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(() => ({
    name: selectedProfile.name,
    email: selectedProfile.email,
    phone: selectedProfile.phone,
    password: 'password123',
  }))

  const pageCopy = useMemo(() => {
    if (isRegister) {
      return {
        title: 'ลงทะเบียน',
        subtitle: 'สร้าง fake user สำหรับทดสอบระบบ Marketplace',
        submit: 'ลงทะเบียนและเข้าใช้งาน',
        switchText: 'มีบัญชีอยู่แล้ว?',
        switchLink: '/login',
        switchLabel: 'เข้าสู่ระบบ',
      }
    }

    return {
      title: 'เข้าสู่ระบบ',
      subtitle: 'เลือกบทบาท fake user เพื่อเข้าใช้งานทันที',
      submit: 'เข้าสู่ระบบ',
      switchText: 'ยังไม่มีบัญชี?',
      switchLink: '/register',
      switchLabel: 'ลงทะเบียน',
    }
  }, [isRegister])

  const handleRoleSelect = (role) => {
    const profile = fakeProfiles[role]
    setSelectedRole(role)
    setForm(prev => ({
      ...prev,
      name: isRegister ? prev.name : profile.name,
      email: profile.email,
      phone: profile.phone,
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const requestToken = async () => {
    const formData = new FormData()
    formData.append('email', form.email.trim() || selectedProfile.email)
    formData.append('password', form.password || 'password123')

    if (isRegister) {
      formData.append('name', form.name.trim() || selectedProfile.name)
      formData.append('phone', form.phone.trim() || selectedProfile.phone)
      formData.append('role', selectedRole)

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) return res.json()

      const err = await res.json().catch(() => ({}))
      if (res.status !== 400 || !String(err.detail || '').includes('อีเมลนี้ถูกใช้งานแล้ว')) {
        throw new Error(err.detail || 'ลงทะเบียนไม่สำเร็จ')
      }
    }

    const loginData = new FormData()
    loginData.append('email', form.email.trim() || selectedProfile.email)
    loginData.append('password', form.password || 'password123')

    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: loginData,
    })

    if (loginRes.ok) return loginRes.json()

    const loginErr = await loginRes.json().catch(() => ({}))

    if (!isRegister && loginRes.status === 401) {
      const registerData = new FormData()
      registerData.append('name', selectedProfile.name)
      registerData.append('email', selectedProfile.email)
      registerData.append('password', 'password123')
      registerData.append('phone', selectedProfile.phone)
      registerData.append('role', selectedRole)

      const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        body: registerData,
      })

      if (registerRes.ok) return registerRes.json()
    }

    throw new Error(loginErr.detail || 'เข้าสู่ระบบไม่สำเร็จ')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const data = await requestToken()
      const realUser = {
        id: data.user?.id,
        role: selectedRole,
        tokenRole: data.user?.role,
        roleLabel: selectedProfile.label,
        name: data.user?.name || form.name.trim() || selectedProfile.name,
        email: form.email.trim() || selectedProfile.email,
        phone: form.phone.trim() || selectedProfile.phone,
      }

      localStorage.setItem('mockRole', selectedRole)
      localStorage.setItem('mockUser', JSON.stringify(realUser))
      localStorage.setItem('access_token', data.access_token)
      window.dispatchEvent(new Event('mockRoleChanged'))
      navigate(selectedProfile.homePath, { replace: true })
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้')
    }
  }

  return (
    <MobileShell title={pageCopy.title} onBack={() => navigate('/')} noNav hideRoleSwitch>
      <div className="auth-page">
        <section className="auth-hero">
          <span aria-hidden="true">🐾</span>
          <h2>{pageCopy.title}</h2>
          <p>{pageCopy.subtitle}</p>
        </section>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-role-grid">
            {Object.values(fakeProfiles).map(profile => (
              <button
                key={profile.role}
                type="button"
                className={`auth-role-card ${selectedRole === profile.role ? 'active' : ''}`}
                onClick={() => handleRoleSelect(profile.role)}
              >
                <span aria-hidden="true">{profile.role === 'buyer' ? '🛒' : '🏪'}</span>
                <strong>{profile.label}</strong>
                <small>{profile.name}</small>
              </button>
            ))}
          </div>

          <div className="auth-form-grid">
            {isRegister && (
              <label>
                ชื่อผู้ใช้ / ชื่อร้าน
                <input name="name" value={form.name} onChange={handleChange} />
              </label>
            )}
            <label>
              อีเมล
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </label>
            {isRegister && (
              <label>
                เบอร์โทร
                <input name="phone" value={form.phone} onChange={handleChange} />
              </label>
            )}
            <label>
              รหัสผ่าน
              <input type="password" name="password" value={form.password} onChange={handleChange} />
            </label>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'กำลังดำเนินการ...' : pageCopy.submit}
          </button>

          {message && (
            <p className="auth-error" role="alert">
              {message}
            </p>
          )}

          <p className="auth-switch">
            {pageCopy.switchText} <Link to={pageCopy.switchLink}>{pageCopy.switchLabel}</Link>
          </p>
        </form>
      </div>
    </MobileShell>
  )
}
