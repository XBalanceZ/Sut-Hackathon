import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

const sightingMarkers = [
  { id: 1, name: 'น้องถุงเงิน', area: 'สวนลุมพินี', time: '12 นาทีที่แล้ว', color: '#ff7a45', left: '58%', top: '35%' },
  { id: 2, name: 'แมวดำปลอกคอแดง', area: 'พร้อมพงษ์', time: '28 นาทีที่แล้ว', color: '#7c5cbf', left: '43%', top: '53%' },
  { id: 3, name: 'ลายสลิดตัวเล็ก', area: 'อารีย์', time: '1 ชม. ที่แล้ว', color: '#00a6a6', left: '28%', top: '31%' },
  { id: 4, name: 'แมวขาวตาฟ้า', area: 'ทองหล่อ', time: '2 ชม. ที่แล้ว', color: '#e83e8c', left: '70%', top: '61%' },
]

const lostCases = [
  {
    id: 'LC-1024',
    name: 'น้องโมจิ',
    detail: 'ขาวเทา หางฟู กลัวคนแปลกหน้า',
    lastSeen: 'ซ.สุขุมวิท 39',
    reward: '2,000',
    status: 'กำลังค้นหา',
  },
  {
    id: 'LC-1025',
    name: 'น้องดำมี่',
    detail: 'สีดำ มีแต้มขาวที่อก ใส่ปลอกคอสีแดง',
    lastSeen: 'สวนเบญจกิติ',
    reward: '1,500',
    status: 'พบเบาะแสใหม่',
  },
]

export default function LostCatsMapPage() {
  const navigate = useNavigate()

  return (
    <MobileShell title="ตามหาแมวหาย" onBack={() => navigate('/')} hideHeaderIcon>
      <div className="marketplace-container" style={{ paddingBottom: '92px' }}>
        <section style={{
          background: '#fff',
          border: '1px solid var(--meow-border)',
          borderRadius: '18px',
          padding: '14px',
          marginBottom: '14px',
          boxShadow: '0 8px 22px rgba(124, 92, 191, 0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: 'var(--meow-text)' }}>แผนที่เบาะแสใกล้คุณ</h2>
              <p style={{ margin: 0, color: 'var(--meow-muted)', fontSize: '0.84rem' }}>จุดพบเจอแมวล่าสุดจากชุมชน</p>
            </div>
            <button type="button" className="meow-btn meow-btn-primary" style={{ width: 'auto', padding: '9px 12px', borderRadius: '12px', fontSize: '0.82rem' }}>
              + แจ้งพบ
            </button>
          </div>

          <div style={{
            position: 'relative',
            height: '330px',
            overflow: 'hidden',
            borderRadius: '16px',
            border: '1px solid #d9ecff',
            background: 'linear-gradient(135deg, #e7f6ff 0%, #f8fbf3 45%, #fff5e6 100%)',
          }}>
            <div style={{ position: 'absolute', inset: '18px 0 auto', height: '18px', background: 'rgba(255,255,255,0.78)', transform: 'rotate(15deg)', boxShadow: '0 86px 0 rgba(255,255,255,0.7), 0 172px 0 rgba(255,255,255,0.72)' }} />
            <div style={{ position: 'absolute', top: '0', left: '40%', width: '18px', height: '120%', background: 'rgba(255,255,255,0.75)', transform: 'rotate(-22deg)', boxShadow: '90px 0 0 rgba(255,255,255,0.58)' }} />
            <div style={{ position: 'absolute', left: '7%', top: '18%', width: '34%', height: '26%', borderRadius: '48% 42% 56% 38%', background: 'rgba(116, 198, 157, 0.38)' }} />
            <div style={{ position: 'absolute', right: '4%', bottom: '8%', width: '32%', height: '24%', borderRadius: '46% 54% 42% 58%', background: 'rgba(118, 200, 255, 0.35)' }} />
            <div style={{ position: 'absolute', left: '18px', top: '14px', background: 'rgba(255,255,255,0.92)', color: 'var(--meow-purple-deep)', borderRadius: '999px', padding: '7px 10px', fontSize: '0.76rem', fontWeight: 800 }}>
              4 จุดพบเจอวันนี้
            </div>
            <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'grid', gap: '6px' }}>
              <button type="button" style={mapToolStyle}>+</button>
              <button type="button" style={mapToolStyle}>-</button>
              <button type="button" style={mapToolStyle}>⌖</button>
            </div>

            {sightingMarkers.map(marker => (
              <div key={marker.id} style={{ position: 'absolute', left: marker.left, top: marker.top, transform: 'translate(-50%, -100%)' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50% 50% 50% 8px',
                  background: marker.color,
                  transform: 'rotate(-45deg)',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
                  border: '3px solid #fff',
                }} />
                <span style={{ position: 'absolute', left: '50%', top: '9px', transform: 'translateX(-50%)', fontSize: '1rem' }}>🐱</span>
              </div>
            ))}

            <div style={{
              position: 'absolute',
              left: '12px',
              right: '12px',
              bottom: '12px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {sightingMarkers.slice(0, 2).map(marker => (
                <div key={marker.id} style={{ background: 'rgba(255,255,255,0.94)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(124,92,191,0.12)' }}>
                  <strong style={{ display: 'block', fontSize: '0.82rem', color: 'var(--meow-text)' }}>{marker.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--meow-muted)', marginTop: '2px' }}>{marker.area} · {marker.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 2px 14px' }}>
          {['ทั้งหมด', 'พบเห็นล่าสุด', 'มีรางวัล', 'ใกล้ฉัน', 'ต้องการอาสา'].map(filter => (
            <button key={filter} type="button" style={{
              flex: '0 0 auto',
              padding: '8px 12px',
              borderRadius: '999px',
              border: filter === 'ทั้งหมด' ? 'none' : '1px solid var(--meow-border)',
              background: filter === 'ทั้งหมด' ? 'var(--meow-purple)' : '#fff',
              color: filter === 'ทั้งหมด' ? '#fff' : 'var(--meow-text)',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}>
              {filter}
            </button>
          ))}
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            ['24', 'เคสเปิดอยู่'],
            ['11', 'พบเบาะแส'],
            ['6', 'กลับบ้านแล้ว'],
          ].map(([value, label]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid var(--meow-border)', borderRadius: '14px', padding: '12px 8px', textAlign: 'center' }}>
              <strong style={{ display: 'block', color: 'var(--meow-purple-deep)', fontSize: '1.25rem' }}>{value}</strong>
              <span style={{ color: 'var(--meow-muted)', fontSize: '0.72rem' }}>{label}</span>
            </div>
          ))}
        </section>

        <h3 style={{ fontSize: '1rem', margin: '0 2px 10px', fontWeight: 800 }}>รายการตามหาใกล้พื้นที่</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {lostCases.map(item => (
            <article key={item.id} style={{ display: 'flex', gap: '12px', background: '#fff', border: '1px solid var(--meow-border)', borderRadius: '16px', padding: '12px' }}>
              <div style={{ width: '72px', height: '72px', flex: '0 0 72px', borderRadius: '14px', background: 'linear-gradient(135deg, #f4e8ff, #ffe8d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🐾</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--meow-text)' }}>{item.name}</h4>
                  <span style={{ flex: '0 0 auto', background: '#fff3cd', color: '#856404', borderRadius: '999px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800 }}>{item.status}</span>
                </div>
                <p style={{ margin: '5px 0 8px', color: 'var(--meow-muted)', fontSize: '0.8rem', lineHeight: 1.35 }}>{item.detail}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--meow-muted)', fontSize: '0.75rem' }}>
                  <span>📍 {item.lastSeen}</span>
                  <strong style={{ color: 'var(--meow-orange-deep)' }}>รางวัล ฿{item.reward}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <BottomNav />
    </MobileShell>
  )
}

const mapToolStyle = {
  width: '34px',
  height: '34px',
  border: '1px solid rgba(124,92,191,0.18)',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.94)',
  color: 'var(--meow-purple-deep)',
  fontWeight: 900,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}
