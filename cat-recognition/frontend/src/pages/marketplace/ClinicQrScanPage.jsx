import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

const recentScans = [
  { id: 'CLI-482019', name: 'โปรแกรมตรวจสุขภาพประจำปี', owner: 'คุณใจดี', time: '09:42', status: 'ใช้สิทธิ์แล้ว' },
  { id: 'CLI-228104', name: 'วัคซีนรวมแมว', owner: 'คุณมินท์', time: '10:18', status: 'รอตรวจ' },
]

export default function ClinicQrScanPage() {
  const navigate = useNavigate()
  const [scanMode, setScanMode] = useState('qr')
  const [mockScanned, setMockScanned] = useState(false)

  return (
    <MobileShell title="สแกนคูปองคลินิก" onBack={() => navigate('/clinics')} hideHeaderIcon>
      <div className="marketplace-container" style={{ paddingBottom: '150px' }}>
        <section style={{
          background: 'linear-gradient(135deg, #102a43, #1c5d7e)',
          color: '#fff',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: '0 10px 24px rgba(16, 42, 67, 0.24)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.18rem' }}>Clinic Pass Scanner</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.84rem' }}>ตรวจสอบ QR code หรือ barcode จากคูปองลูกค้า</p>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.14)', borderRadius: '12px', padding: '8px 10px', fontWeight: 800, fontSize: '0.78rem' }}>MOCK</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[
              ['qr', 'QR Code'],
              ['barcode', 'Barcode'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScanMode(mode)}
                style={{
                  padding: '10px',
                  border: scanMode === mode ? '2px solid #fff' : '1px solid rgba(255,255,255,0.26)',
                  borderRadius: '12px',
                  background: scanMode === mode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{
            position: 'relative',
            height: '370px',
            borderRadius: '18px',
            overflow: 'hidden',
            background: 'radial-gradient(circle at 50% 34%, #284b63, #061923 72%)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: scanMode === 'qr' ? '39%' : '36%',
              transform: 'translate(-50%, -50%)',
              width: scanMode === 'qr' ? '190px' : '246px',
              height: scanMode === 'qr' ? '190px' : '116px',
              border: '2px solid rgba(255,255,255,0.88)',
              borderRadius: scanMode === 'qr' ? '22px' : '16px',
              boxShadow: '0 0 0 999px rgba(0,0,0,0.34)',
            }}>
              <span style={cornerStyle('top', 'left')} />
              <span style={cornerStyle('top', 'right')} />
              <span style={cornerStyle('bottom', 'left')} />
              <span style={cornerStyle('bottom', 'right')} />
              <div style={{
                position: 'absolute',
                left: '10px',
                right: '10px',
                top: mockScanned ? '70%' : '22%',
                height: '3px',
                borderRadius: '999px',
                background: '#6dd5ed',
                boxShadow: '0 0 18px rgba(109, 213, 237, 0.95)',
                transition: 'top 0.35s ease',
              }} />

              {scanMode === 'qr' ? <MockQr /> : <MockBarcode />}
            </div>

            <div style={{
              position: 'absolute',
              left: '14px',
              right: '14px',
              bottom: '14px',
              zIndex: 4,
              display: 'grid',
              gap: '10px',
              padding: '12px',
              borderRadius: '18px',
              background: 'rgba(6, 25, 35, 0.84)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <p style={{ margin: 0, textAlign: 'center', color: 'rgba(255,255,255,0.82)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                วางโค้ดให้อยู่ในกรอบเพื่ออ่านข้อมูลคูปอง
              </p>
              <button
                type="button"
                onClick={() => setMockScanned(true)}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '12px 14px',
                  border: 'none',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6dd5ed, #a1c4fd)',
                  color: '#102a43',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                สแกนคูปอง
              </button>
            </div>
          </div>
        </section>

        {mockScanned && (
          <section style={{ background: '#fff', border: '1px solid #d4edda', borderRadius: '18px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#155724', fontSize: '1.02rem' }}>คูปองถูกต้อง</h3>
                <p style={{ margin: 0, color: 'var(--meow-muted)', fontSize: '0.8rem' }}>CLI-839204 · ยังไม่ถูกใช้งาน</p>
              </div>
              <span style={{ background: '#d4edda', color: '#155724', borderRadius: '999px', padding: '6px 10px', fontWeight: 900, fontSize: '0.76rem' }}>VALID</span>
            </div>
            <div style={{ display: 'grid', gap: '8px', fontSize: '0.86rem' }}>
              <InfoRow label="แพ็กเกจ" value="โปรแกรมตรวจสุขภาพประจำปี" />
              <InfoRow label="ลูกค้า" value="คุณใจดี รักแมว" />
              <InfoRow label="ผู้รับบริการ" value="น้องโมจิ · แมว Scottish Fold" />
              <InfoRow label="หมดอายุ" value="30 ก.ย. 2569" />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button type="button" className="meow-btn meow-btn-outline" style={{ flex: 1, padding: '11px', borderRadius: '12px' }} onClick={() => setMockScanned(false)}>
                สแกนใหม่
              </button>
              <button type="button" className="meow-btn meow-btn-primary" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>
                ยืนยันใช้สิทธิ์
              </button>
            </div>
          </section>
        )}

        <section style={{ background: '#fff', border: '1px solid var(--meow-border)', borderRadius: '18px', padding: '14px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--meow-text)' }}>ประวัติการสแกนวันนี้</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {recentScans.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', borderBottom: '1px solid #f1f3f5', paddingBottom: '10px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--meow-text)' }}>{item.name}</strong>
                  <span style={{ display: 'block', marginTop: '3px', fontSize: '0.76rem', color: 'var(--meow-muted)' }}>{item.id} · {item.owner}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--meow-muted)' }}>{item.time}</span>
                  <strong style={{ display: 'block', marginTop: '3px', fontSize: '0.72rem', color: item.status === 'ใช้สิทธิ์แล้ว' ? '#155724' : '#856404' }}>{item.status}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <BottomNav />
    </MobileShell>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderTop: '1px solid #f1f3f5' }}>
      <span style={{ color: 'var(--meow-muted)' }}>{label}</span>
      <strong style={{ textAlign: 'right', color: 'var(--meow-text)' }}>{value}</strong>
    </div>
  )
}

function MockQr() {
  return (
    <div style={{ position: 'absolute', inset: '34px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', opacity: 0.9 }}>
      {Array.from({ length: 25 }).map((_, index) => (
        <span key={index} style={{ borderRadius: '4px', background: [0, 1, 3, 5, 9, 11, 12, 16, 19, 20, 23, 24].includes(index) ? '#fff' : 'rgba(255,255,255,0.18)' }} />
      ))}
    </div>
  )
}

function MockBarcode() {
  const bars = [8, 18, 6, 12, 24, 8, 16, 6, 28, 12, 8, 20, 6, 14, 24]
  return (
    <div style={{ position: 'absolute', left: '24px', right: '24px', top: '36px', bottom: '36px', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: '5px', opacity: 0.9 }}>
      {bars.map((width, index) => (
        <span key={index} style={{ width: `${Math.max(3, width / 4)}px`, background: '#fff', borderRadius: '2px' }} />
      ))}
    </div>
  )
}

function cornerStyle(vertical, horizontal) {
  return {
    position: 'absolute',
    [vertical]: '-3px',
    [horizontal]: '-3px',
    width: '38px',
    height: '38px',
    borderColor: '#6dd5ed',
    borderStyle: 'solid',
    borderWidth: `${vertical === 'top' ? 4 : 0}px ${horizontal === 'right' ? 4 : 0}px ${vertical === 'bottom' ? 4 : 0}px ${horizontal === 'left' ? 4 : 0}px`,
    borderRadius: `${vertical === 'top' && horizontal === 'left' ? 18 : 0}px ${vertical === 'top' && horizontal === 'right' ? 18 : 0}px ${vertical === 'bottom' && horizontal === 'right' ? 18 : 0}px ${vertical === 'bottom' && horizontal === 'left' ? 18 : 0}px`,
  }
}
