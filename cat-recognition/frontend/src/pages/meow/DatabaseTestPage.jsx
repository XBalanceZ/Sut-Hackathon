import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './DatabaseTestPage.css'

export default function DatabaseTestPage() {
  const [activeTab, setActiveTab] = useState('ddl')
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([
    { id: 1, name: 'เจ้าของสมชาย (Owner)', role: 'Owner', phone: '0811111111', token: null, balance: 0 },
    { id: 2, name: 'พลเมืองดีสมหมาย (Finder)', role: 'Finder', phone: '0822222222', token: null, balance: 0 }
  ])
  const [currentUser, setCurrentUser] = useState(null)
  
  // SOS States
  const [sosPetId, setSosPetId] = useState('')
  const [sosLocation, setSosLocation] = useState('มหาวิทยาลัยเทคโนโลยีสุรนารี')
  const [sosLat, setSosLat] = useState('14.8824')
  const [sosLng, setSosLng] = useState('102.0206')
  const [sosReward, setSosReward] = useState('10000')
  const [activeReports, setActiveReports] = useState([])

  // Sighting Check-In States
  const [selectedReportId, setSelectedReportId] = useState('')
  const [checkinLocation, setCheckinLocation] = useState('ประตู 1 มทส.')
  const [checkinLat, setCheckinLat] = useState('14.8824')
  const [checkinLng, setCheckinLng] = useState('102.0206')
  const [exifPreset, setExifPreset] = useState('success') // success | far | old | custom
  const [customFile, setCustomFile] = useState(null)
  const [checkinResult, setCheckinResult] = useState(null)
  
  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [{ timestamp, message, data }, ...prev])
  }

  // Pre-load / Login mock users on mount
  useEffect(() => {
    const initLogins = async () => {
      addLog('กำลังเชื่อมต่อเซิร์ฟเวอร์หลังบ้านเพื่อจำลองบัญชีผู้ใช้...')
      const updatedUsers = [...users]
      
      for (let i = 0; i < updatedUsers.length; i++) {
        const u = updatedUsers[i]
        try {
          const formData = new FormData()
          formData.append('phone', u.phone)
          formData.append('role', u.role)
          formData.append('name', u.name.split(' ')[0])

          const res = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            body: formData,
          })
          const data = await res.json()
          if (res.ok) {
            updatedUsers[i] = {
              ...u,
              id: data.user.id,
              token: data.access_token,
              balance: data.user.wallet_balance || 0
            }
            addLog(`ล็อกอินสำเร็จ: ${u.name} (ID: ${data.user.id})`, data)
          }
        } catch (err) {
          addLog(`ข้อผิดพลาดการเชื่อมต่อ ${u.name}: ${err.message}`)
        }
      }
      setUsers(updatedUsers)
      setCurrentUser(updatedUsers[0]) // Select Owner as default
      fetchReports()
    }
    initLogins()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setActiveReports(data.items || [])
        if (data.items && data.items.length > 0) {
          setSelectedReportId(data.items[0].report_id)
        }
      }
    } catch (err) {
      addLog(`ไม่สามารถดึงข้อมูลรายงาน SOS: ${err.message}`)
    }
  }

  const handleUserChange = (userId) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setCurrentUser(user)
      addLog(`เปลี่ยนผู้ใช้ใช้งานเป็น: ${user.name}`)
    }
  }

  // Action: Open SOS
  const handleOpenSos = async (e) => {
    e.preventDefault()
    if (!currentUser || currentUser.role !== 'Owner') {
      alert('ต้องใช้บทบาท Owner ในการตั้ง SOS!')
      return
    }

    try {
      addLog('กำลังเปิดโหมด SOS และหักเงินรางวัลล็อกไว้ใน Escrow...')
      
      // First ensure a pet profile exists, or create a mock one if needed
      let petId = sosPetId
      if (!petId) {
        addLog('ไม่พบ Pet ID, กำลังสร้างโปรไฟล์แมวจำลองอัตโนมัติ...')
        const petFormData = new FormData()
        petFormData.append('cat_name', 'น้องส้มลายพาด')
        petFormData.append('breed', 'ส้มสยาม')
        petFormData.append('features', 'หางงอ หูซ้ายแหว่งเล็กน้อย')
        
        // Generate a mock face photo for registration
        const mockImgRes = await fetch(`http://localhost:8000/api/test/generate-exif-photo?lat=14.8824&lng=102.0206&dt=2026:06:02 12:00:00`)
        const mockBlob = await mockImgRes.blob()
        petFormData.append('image', mockBlob, 'som.jpg')

        const regRes = await fetch('http://localhost:8000/api/owner/register-cat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentUser.token}` },
          body: petFormData
        })
        const regData = await regRes.json()
        if (!regRes.ok) throw new Error(regData.detail || 'ลงทะเบียนแมวไม่สำเร็จ')
        petId = regData.pet_id
        setSosPetId(petId)
        addLog(`สร้างแมวสำเร็จ ID: ${petId}`, regData)
      }

      const formData = new FormData()
      formData.append('pet_id', petId)
      formData.append('missing_location', sosLocation)
      formData.append('lat', sosLat)
      formData.append('lng', sosLng)
      formData.append('reward_amount', sosReward)

      const res = await fetch('http://localhost:8000/api/owner/sos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        addLog(`เปิด SOS สำเร็จ! เงินรางวัลถูกล็อกใน Escrow (หัก Fee 10% เรียบร้อย)`, data)
        fetchReports()
      } else {
        addLog(`เปิด SOS ล้มเหลว: ${data.detail}`)
      }
    } catch (err) {
      addLog(`ข้อผิดพลาดระบบ SOS: ${err.message}`)
    }
  }

  // Action: Check-in with anti-fraud metadata
  const handleCheckin = async (e) => {
    e.preventDefault()
    if (!currentUser || currentUser.role !== 'Finder') {
      alert('ต้องใช้บทบาท พลเมืองดี (Finder) ในการเช็คอินรายงานแมว!')
      return
    }
    if (!selectedReportId) {
      alert('กรุณาเลือกรายงาน SOS ที่จะแจ้งเจอ')
      return
    }

    try {
      addLog('กำลังสร้าง/รับไฟล์ภาพที่มี EXIF ตามเงื่อนไขเพื่อส่งตรวจจับกลโกง...')
      let photoBlob
      let photoName = 'scan.jpg'

      if (exifPreset === 'custom' && customFile) {
        photoBlob = customFile
        photoName = customFile.name
      } else {
        let genLat = checkinLat
        let genLng = checkinLng
        let genDt = '2026:06:02 12:00:00' // Current time mock

        if (exifPreset === 'far') {
          // Mock location far away (Bangkok)
          genLat = '13.7563'
          genLng = '100.5018'
          addLog('จำลอง: ถ่ายรูปที่กรุงเทพฯ (ห่างออกไป 300+ กม.) เพื่อตีกินเงินรางวัล มทส.')
        } else if (exifPreset === 'old') {
          // Mock old date (3 days ago)
          genDt = '2026:05:30 12:00:00'
          addLog('จำลอง: นำรูปเก่าที่ถ่ายไว้เมื่อ 3 วันที่แล้วมาสวมสิทธิ์เคลมเงินรางวัล')
        } else {
          addLog('จำลอง: ถ่ายรูปในระยะ 500 เมตร และอยู่ในช่วงเวลาแจ้งเจอจริง')
        }

        const genRes = await fetch(`http://localhost:8000/api/test/generate-exif-photo?lat=${genLat}&lng=${genLng}&dt=${genDt}`)
        if (!genRes.ok) throw new Error('ไม่สามารถดึงรูปภาพที่มีเมทาดาตาจำลองได้')
        photoBlob = await genRes.blob()
      }

      const formData = new FormData()
      formData.append('report_id', selectedReportId)
      formData.append('checkin_location', checkinLocation)
      formData.append('lat', checkinLat)
      formData.append('lng', checkinLng)
      formData.append('image', photoBlob, photoName)

      addLog('กำลังเรียกใช้ API Checkin เพื่อตรวจจับข้อมูลและรัน AI คำนวณความเหมือน...')
      const res = await fetch('http://localhost:8000/api/finder/checkin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setCheckinResult(data)
        addLog(`บันทึกเช็คอินสำเร็จ! ผลการตรวจจับความปลอดภัย: ${data.verification.valid ? 'ผ่าน (Valid)' : 'ไม่ผ่าน (Fraud Alert)'}`, data)
      } else {
        addLog(`เช็คอินล้มเหลว: ${data.detail}`)
      }
    } catch (err) {
      addLog(`ข้อผิดพลาดเช็คอิน: ${err.message}`)
    }
  }

  // Action: Release Escrow Reward
  const handleReleaseReward = async (reportId, finderId) => {
    if (!currentUser || currentUser.role !== 'Owner') {
      alert('เจ้าของแมว (Owner) เท่านั้นที่มีสิทธิ์อนุมัติโอนเงินรางวัล!')
      return
    }

    try {
      addLog('กำลังอนุมัติโอนเงินรางวัลจากระบบ Escrow เข้ากระเป๋าพลเมืองดี...')
      const formData = new FormData()
      formData.append('report_id', reportId)
      formData.append('finder_id', finderId)

      const res = await fetch('http://localhost:8000/api/owner/release-reward', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        addLog(`โอนเงินรางวัลสำเร็จ! พลเมืองดีได้รับเงินรางวัลใน Wallet แล้ว`, data)
        
        // Refresh users state to update wallet balance
        const updatedUsers = users.map(u => {
          if (u.role === 'Finder') {
            return { ...u, balance: data.data.finder_wallet_balance }
          }
          return u
        })
        setUsers(updatedUsers)
        fetchReports()
      } else {
        addLog(`การโอนรางวัลล้มเหลว: ${data.detail}`)
      }
    } catch (err) {
      addLog(`ข้อผิดพลาดการอนุมัติโอนเงิน: ${err.message}`)
    }
  }

  const ddlString = `-- ====================================================================
-- Database Schema DDL for MEOW MATCH Application (Oracle SQL Dialect)
-- ====================================================================

-- 1. Table: USERS
CREATE TABLE USERS (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR2(255) NOT NULL,
    role        VARCHAR2(16) NOT NULL,
    phone       VARCHAR2(32),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_user_role CHECK (role IN ('Owner', 'Finder'))
);

-- 2. Table: PET_PROFILES
CREATE TABLE PET_PROFILES (
    id                 NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id           NUMBER NOT NULL,
    cat_name           VARCHAR2(255) NOT NULL,
    breed              VARCHAR2(128),
    features           CLOB,
    face_id_vector_ref VARCHAR2(255),
    passport_status    VARCHAR2(16) DEFAULT 'Free' NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_pet_owner FOREIGN KEY (owner_id) REFERENCES USERS(id) ON DELETE CASCADE,
    CONSTRAINT check_passport_status CHECK (passport_status IN ('Free', 'Premium'))
);

CREATE INDEX idx_pet_owner_id ON PET_PROFILES(owner_id);

-- 3. Table: LOST_REPORTS
CREATE TABLE LOST_REPORTS (
    id                    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pet_id                NUMBER NOT NULL,
    missing_location      VARCHAR2(512) NOT NULL,
    alert_radius_km       NUMBER(5, 2) DEFAULT 1.0 NOT NULL,
    reward_amount         NUMBER DEFAULT 0 NOT NULL,
    status                VARCHAR2(16) DEFAULT 'Active' NOT NULL,
    premium_priority_flag NUMBER(1) DEFAULT 0 NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_report_pet FOREIGN KEY (pet_id) REFERENCES PET_PROFILES(id) ON DELETE CASCADE,
    CONSTRAINT check_report_status CHECK (status IN ('Active', 'Resolved')),
    CONSTRAINT check_priority_flag CHECK (premium_priority_flag IN (0, 1))
);

CREATE INDEX idx_report_pet_id ON LOST_REPORTS(pet_id);

-- 4. Table: FINDER_CHECKINS
CREATE TABLE FINDER_CHECKINS (
    id                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id         NUMBER NOT NULL,
    finder_id         NUMBER NOT NULL,
    checkin_location  VARCHAR2(512) NOT NULL,
    confidence_score  NUMBER(5, 2) DEFAULT 0.0 NOT NULL,
    photo_metadata    CLOB,
    checked_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_checkin_report FOREIGN KEY (report_id) REFERENCES LOST_REPORTS(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_finder FOREIGN KEY (finder_id) REFERENCES USERS(id) ON DELETE CASCADE,
    CONSTRAINT check_photo_metadata_json CHECK (photo_metadata IS JSON)
);

CREATE INDEX idx_checkin_report_id ON FINDER_CHECKINS(report_id);
CREATE INDEX idx_checkin_finder_id ON FINDER_CHECKINS(finder_id);

-- 5. Table: ESCROW_TRANSACTIONS
CREATE TABLE ESCROW_TRANSACTIONS (
    id            NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id     NUMBER NOT NULL,
    amount_held   NUMBER NOT NULL,
    platform_fee  NUMBER NOT NULL,
    payout_status VARCHAR2(16) DEFAULT 'Held' NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_escrow_report FOREIGN KEY (report_id) REFERENCES LOST_REPORTS(id) ON DELETE CASCADE,
    CONSTRAINT check_payout_status CHECK (payout_status IN ('Held', 'Released'))
);

CREATE INDEX idx_escrow_report_id ON ESCROW_TRANSACTIONS(report_id);`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ddlString)
    alert('คัดลอก DDL Script ไปยังบอร์ดบันทึกชั่วคราวแล้ว!')
  }

  return (
    <MobileShell title="DBA & Escrow Test Dashboard" badge="🛠️" backTo="/">
      <div className="db-container">
        
        <div className="db-tabs">
          <button 
            className={`db-tab-btn ${activeTab === 'ddl' ? 'active' : ''}`}
            onClick={() => setActiveTab('ddl')}
          >
            🗄️ Oracle DDL SQL
          </button>
          <button 
            className={`db-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            🧪 Sandbox Simulator
          </button>
        </div>

        {activeTab === 'ddl' ? (
          <div className="ddl-section">
            <div className="ddl-header-row">
              <h3>Oracle Database DDL Schema</h3>
              <button className="copy-btn" onClick={copyToClipboard}>
                📋 คัดลอก SQL
              </button>
            </div>
            <p className="db-subtitle" style={{ marginTop: 0 }}>
              คำสั่งสำหรับสร้างตารางที่ใช้ใน MEOW MATCH (สอดรับกับ Oracle Database 12c+ และ constraints ทั้งหมด)
            </p>
            <pre className="sql-block">
              {ddlString.split('\n').map((line, idx) => {
                if (line.startsWith('--')) {
                  return <div key={idx} className="sql-comment">{line}</div>
                }
                let highlighted = line
                  .replace(/\b(CREATE TABLE|CREATE INDEX|PRIMARY KEY|FOREIGN KEY|REFERENCES|CHECK|CONSTRAINT)\b/g, '<span class="sql-keyword">$1</span>')
                  .replace(/\b(NUMBER|VARCHAR2|CLOB|TIMESTAMP)\b/g, '<span class="sql-type">$1</span>')
                  .replace(/\b(ON DELETE CASCADE|ON DELETE SET NULL|DEFAULT|NOT NULL|IS JSON)\b/g, '<span class="sql-constraint">$1</span>')
                return (
                  <div 
                    key={idx} 
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                )
              })}
            </pre>
          </div>
        ) : (
          <div className="simulator-section">
            <h3>ธุรกรรมจำลองและเครื่องมือทดสอบ EXIF</h3>
            <p className="db-subtitle" style={{ marginTop: 0 }}>
              จำลองพฤติกรรมเจ้าของแมวเปิดโหมด SOS และล็อกเงินรางวัล สกัด EXIF รูปภาพเช็คอินเพื่อจับโกง
            </p>

            {currentUser && (
              <div className="active-user-banner">
                <span>
                  กำลังทำงานในฐานะ: <strong>{currentUser.name}</strong> 
                  <span style={{ marginLeft: 8 }} className={`alert-badge ${currentUser.role === 'Owner' ? 'alert-success' : 'alert-danger'}`}>
                    {currentUser.role}
                  </span>
                </span>
                <span style={{ fontSize: '0.9rem' }}>
                  กระเป๋าเงิน: <strong>฿{currentUser.balance.toLocaleString()}</strong>
                </span>
              </div>
            )}

            {/* Step 1: User Manager */}
            <div className="sim-step-card">
              <span className="sim-step-badge">ขั้นตอนที่ 1</span>
              <h4>สลับบัญชีผู้ใช้ใช้งานจำลอง</h4>
              <div className="sim-user-grid">
                {users.map(u => (
                  <div 
                    key={u.id}
                    className={`user-pill ${currentUser?.id === u.id ? 'selected' : ''}`}
                    onClick={() => handleUserChange(u.id)}
                  >
                    <div className="user-pill-name">{u.name.split(' ')[0]}</div>
                    <div className="user-pill-role">บทบาท: {u.role}</div>
                    <div className="user-pill-wallet">Wallet: ฿{u.balance.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Open SOS (Owner only) */}
            <div className="sim-step-card" style={{ opacity: currentUser?.role !== 'Owner' ? 0.6 : 1 }}>
              <span className="sim-step-badge">ขั้นตอนที่ 2</span>
              <h4>ประกาศ SOS แมวหาย (เจ้าของแมวเท่านั้น)</h4>
              <form onSubmit={handleOpenSos}>
                <div className="form-grid">
                  <div>
                    <label className="meow-label">รหัสแมว (ใส่ว่างเพื่อลงทะเบียนจำลองใหม่)</label>
                    <input 
                      type="number" 
                      className="meow-input" 
                      placeholder="เช่น 1" 
                      value={sosPetId}
                      onChange={e => setSosPetId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="meow-label">เงินรางวัลตั้งล่อ (บาท)</label>
                    <input 
                      type="number" 
                      className="meow-input" 
                      placeholder="เช่น 5000" 
                      value={sosReward}
                      onChange={e => setSosReward(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div>
                    <label className="meow-label">สถานที่พิกัดแจ้งหาย</label>
                    <input 
                      type="text" 
                      className="meow-input" 
                      value={sosLocation} 
                      onChange={e => setSosLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="meow-label">พิกัด Lat, Lng</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        type="text" 
                        className="meow-input" 
                        style={{ flex: 1 }} 
                        value={sosLat}
                        onChange={e => setSosLat(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="meow-input" 
                        style={{ flex: 1 }} 
                        value={sosLng}
                        onChange={e => setSosLng(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="meow-btn meow-btn-primary" 
                  disabled={currentUser?.role !== 'Owner'}
                >
                  🆘 ประกาศ SOS + ล็อกเงินรางวัลใน Escrow
                </button>
              </form>
            </div>

            {/* Step 3: Finder Check-In with Anti-Fraud */}
            <div className="sim-step-card" style={{ opacity: currentUser?.role !== 'Finder' ? 0.6 : 1 }}>
              <span className="sim-step-badge">ขั้นตอนที่ 3</span>
              <h4>พลเมืองดีแจ้งเช็คอินพิกัด + ตรวจสอบ EXIF รูปภาพ</h4>
              <form onSubmit={handleCheckin}>
                <div className="form-grid">
                  <div>
                    <label className="meow-label">เลือกรายการแจ้งหาย SOS</label>
                    <select 
                      className="meow-input" 
                      value={selectedReportId} 
                      onChange={e => setSelectedReportId(e.target.value)}
                    >
                      <option value="">-- กรุณาเลือก --</option>
                      {activeReports.map(r => (
                        <option key={r.report_id} value={r.report_id}>
                          SOS #{r.report_id} - แมวชื่อ {r.cat_name} (รางวัล: ฿{r.reward_amount})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="meow-label">ระบุสถานที่ที่แจ้งเจอ</label>
                    <input 
                      type="text" 
                      className="meow-input" 
                      value={checkinLocation} 
                      onChange={e => setCheckinLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="meow-label">ระบุพิกัด Lat, Lng ที่พลเมืองดีปักหมุดแจ้งเจอ</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        type="text" 
                        className="meow-input" 
                        style={{ flex: 1 }} 
                        value={checkinLat}
                        onChange={e => setCheckinLat(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="meow-input" 
                        style={{ flex: 1 }} 
                        value={checkinLng}
                        onChange={e => setCheckinLng(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="meow-label">การสวมสิทธิ์ / สถานะจำลองเมทาดาตาภาพ</label>
                    <select 
                      className="meow-input" 
                      value={exifPreset} 
                      onChange={e => setExifPreset(e.target.value)}
                    >
                      <option value="success">✅ พลเมืองดีตัวจริง (EXIF ตรงกับหมุดเช็คอิน)</option>
                      <option value="far">❌ ตีกินเคลมเงิน (ถ่ายรูปที่กรุงเทพฯ ห่าง 300 กม.)</option>
                      <option value="old">❌ รูปถ่ายเก่า (ถ่ายไว้ 3 วันที่แล้ว นำมาสวมสิทธิ์)</option>
                      <option value="custom">📷 อัปโหลดรูปจริงที่มี EXIF ตนเอง</option>
                    </select>
                  </div>
                </div>

                {exifPreset === 'custom' && (
                  <div style={{ marginBottom: 12 }}>
                    <label className="meow-label">เลือกรูปภาพที่มีพิกัดจริงของคุณ</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="meow-input" 
                      onChange={e => setCustomFile(e.target.files[0])}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="meow-btn meow-btn-primary" 
                  disabled={currentUser?.role !== 'Finder'}
                >
                  📷 ส่งเช็คอินแจ้งเจอแมว + รันระบบประมวลผล EXIF
                </button>
              </form>

              {checkinResult && (
                <div style={{ marginTop: 16, border: '1.5px solid var(--meow-border)', padding: 14, borderRadius: 'var(--meow-radius-sm)' }}>
                  <h5>ผลลัพธ์การบันทึก & ตรวจสอบพิกัด EXIF:</h5>
                  <div style={{ margin: '8px 0' }}>
                    สถานะการตรวจสอบภาพ: 
                    <span 
                      style={{ marginLeft: 8 }} 
                      className={`alert-badge ${checkinResult.verification.valid ? 'alert-success' : 'alert-danger'}`}
                    >
                      {checkinResult.verification.valid ? '✓ ถูกต้อง (Valid)' : '✗ ตรวจพบความเสี่ยง (Fraud Mismatch)'}
                    </span>
                  </div>
                  
                  <table className="exif-details-table">
                    <thead>
                      <tr>
                        <th>พารามิเตอร์</th>
                        <th>ข้อมูลที่พลเมืองดีกรอก</th>
                        <th>ถอดรหัสจาก EXIF ในไฟล์รูป</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>พิกัด (GPS)</strong></td>
                        <td>{checkinResult.verification.exif_lat ? `${checkinLat}, ${checkinLng}` : 'ไม่มีข้อมูล'}</td>
                        <td>
                          {checkinResult.verification.exif_lat ? (
                            `${checkinResult.verification.exif_lat.toFixed(4)}, ${checkinResult.verification.exif_lng.toFixed(4)}`
                          ) : (
                            <span style={{ color: 'red' }}>ไม่พบพิกัด (GPS) ในรูปภาพ</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>วันเวลาถ่ายรูป</strong></td>
                        <td>ตอนนี้ (ตามเครื่อง)</td>
                        <td>
                          {checkinResult.verification.exif_time ? (
                            checkinResult.verification.exif_time.replace('T', ' ')
                          ) : (
                            <span style={{ color: 'red' }}>ไม่พบวันที่ถ่ายรูปในรูปภาพ</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>ระยะทางต่าง</strong></td>
                        <td colSpan="2">
                          {checkinResult.verification.distance_km !== null ? (
                            <strong>{checkinResult.verification.distance_km.toFixed(3)} กิโลเมตร</strong>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>เวลาต่าง</strong></td>
                        <td colSpan="2">
                          {checkinResult.verification.time_diff_hours !== null ? (
                            <strong>{checkinResult.verification.time_diff_hours.toFixed(2)} ชั่วโมง</strong>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>สรุปการคัดกรอง</strong></td>
                        <td colSpan="2" style={{ color: checkinResult.verification.valid ? 'green' : 'red', fontWeight: 'bold' }}>
                          {checkinResult.verification.reason}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>AI Match Score</strong></td>
                        <td colSpan="2">
                          ความคล้ายคลึงใบหน้าแมว: <strong>{checkinResult.confidence_score}%</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {checkinResult.verification.valid && currentUser?.role === 'Finder' && (
                    <div style={{ marginTop: 12 }} className="sim-log-box">
                      💡 <strong>คำแนะนำ:</strong> สลับบัญชีใช้งานเป็นเจ้าของแมว (Owner) ด้านบน เพื่อกดอนุมัติจ่ายเงินรางวัลล็อกไว้ในระบบให้กับคุณ!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Release Escrow (Owner only) */}
            <div className="sim-step-card" style={{ opacity: currentUser?.role !== 'Owner' ? 0.6 : 1 }}>
              <span className="sim-step-badge">ขั้นตอนที่ 4</span>
              <h4>เจ้าของแมวเดินทางมารับแมวและจ่ายเงินรางวัล (เจ้าของแมวเท่านั้น)</h4>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                เมื่อเจ้าของแมวพบแมวแล้ว จะกดยืนยันเพื่อโอนเงินที่ล็อกอยู่ใน Escrow เข้าสู่ Wallet ของพลเมืองดี (หักค่าธรรมเนียมแพลตฟอร์ม 10%)
              </p>
              
              <div style={{ marginTop: 12 }}>
                {activeReports.filter(r => r.status === 'Active').length === 0 ? (
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#999' }}>ไม่มีรายงาน SOS ที่กำลังหาสมาชิก ณ ขณะนี้</p>
                ) : (
                  activeReports.filter(r => r.status === 'Active').map(r => (
                    <div key={r.report_id} className="pet-select-item">
                      <div>
                        <strong>SOS #{r.report_id} - {r.cat_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          พิกัดหาย: {r.missing_location} | เงินรางวัล: ฿{r.reward_amount}
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => handleReleaseReward(r.report_id, 2)} // Payout to Finder ID: 2
                        className="copy-btn"
                        style={{ borderStyle: 'solid' }}
                        disabled={currentUser?.role !== 'Owner'}
                      >
                        💸 ปล่อยเงินรางวัล ฿{(r.reward_amount * 0.9).toLocaleString()} (หัก Fee 10%)
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Event Logs Console */}
            <div className="sim-step-card" style={{ background: '#1e1e24', color: '#00ff66', fontFamily: 'monospace' }}>
              <h5 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: 6 }}>📜 Real-Time Console Event Logs</h5>
              <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.length === 0 ? (
                  <div style={{ color: '#888' }}>รอรับการเรียกใช้งานซอฟต์แวร์ API...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{ borderBottom: '1px solid #2a2a35', paddingBottom: 4 }}>
                      <span style={{ color: '#ffb088' }}>[{log.timestamp}]</span> {log.message}
                      {log.data && (
                        <pre style={{ margin: '4px 0 0 10px', color: '#a9b2c3', fontSize: '0.75rem', overflowX: 'auto' }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </MobileShell>
  )
}
