import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './marketplace.css'

export default function ManageShelterPage() {
  const navigate = useNavigate()
  const [shelterName, setShelterName] = useState('Meow Paradise Hotel')
  const [address, setAddress] = useState('123 ถนนแมวเหมียว เขตคลองเตย กรุงเทพฯ')
  const [phone, setPhone] = useState('02-123-4567')
  const [description, setDescription] = useState('โรงแรมแมวระดับพรีเมียม พร้อมระบบปรับอากาศและกล้องวงจรปิด 24 ชม.')
  const [position, setPosition] = useState([13.7563, 100.5018])

  const availableTags = ['🏥 คลินิก', '🍽️ อาหาร', '🛏️ ห้องพัก', '🎮 พื้นที่เล่น', '❄️ แอร์ 24 ชม.', '📷 ดูกล้อง']
  const [selectedTags, setSelectedTags] = useState(['🏥 คลินิก', '🛏️ ห้องพัก', '🍽️ อาหาร'])

  const [rooms, setRooms] = useState([
    { id: 1, name: 'ห้องพักแอร์ (Standard)', qty: 5, price: 350 },
    { id: 2, name: 'ห้องพัก VIP (มีกล้องดูแมว 24 ชม.)', qty: 2, price: 600 }
  ])

  const handleAddRoom = () => {
    const name = prompt('ชื่อห้องพัก/บริการ:')
    if (!name) return
    const qty = prompt('จำนวนห้องที่ว่าง:')
    if (!qty) return
    const price = prompt('ราคาต่อคืน (บาท):')
    if (!price) return
    
    setRooms([...rooms, { id: Date.now(), name, qty: parseInt(qty, 10), price: parseInt(price, 10) }])
  }

  const handleRemoveRoom = (id) => {
    if (window.confirm('ต้องการลบห้องพักนี้หรือไม่?')) {
      setRooms(rooms.filter(r => r.id !== id))
    }
  }

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng])
      },
    })
    return position === null ? null : (
      <Marker position={position}></Marker>
    )
  }

  const handleSave = () => {
    alert('บันทึกข้อมูลเรียบร้อยแล้ว')
    navigate('/sell-dashboard')
  }

  return (
    <MobileShell title="จัดการที่พัก/โรงแรมแมว" onBack={() => navigate('/sell-dashboard')} noNav>
      <div style={{ padding: '16px', background: '#f8f9fa', minHeight: '100%' }}>
        
        <div className="meow-card" style={{ padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>ข้อมูลทั่วไปของที่พัก</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ชื่อที่พัก</label>
            <input 
              type="text" 
              className="meow-input" 
              value={shelterName} 
              onChange={e => setShelterName(e.target.value)} 
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>เบอร์ติดต่อ</label>
            <input 
              type="text" 
              className="meow-input" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ที่อยู่</label>
            <textarea 
              className="meow-input" 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              rows={2}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>รายละเอียด</label>
            <textarea 
              className="meow-input" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>ปักหมุดแผนที่ (คลิกเพื่อเปลี่ยนตำแหน่ง)</label>
            <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--meow-border)' }}>
              <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker />
              </MapContainer>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--meow-muted)' }}>พิกัด: {position[0].toFixed(4)}, {position[1].toFixed(4)}</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--meow-muted)' }}>สิ่งอำนวยความสะดวก (คลิกเพื่อเลือก)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: selectedTags.includes(tag) ? 'var(--meow-purple)' : '#dee2e6',
                    background: selectedTags.includes(tag) ? 'var(--meow-purple-soft)' : '#fff',
                    color: selectedTags.includes(tag) ? 'var(--meow-purple-deep)' : '#495057',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="meow-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>ห้องพัก / บริการ</h3>
            <button className="meow-btn meow-btn-outline" onClick={handleAddRoom} style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '12px' }}>+ เพิ่มบริการ</button>
          </div>

          {rooms.map(room => (
            <div key={room.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--meow-border)', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>{room.name}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--meow-muted)' }}>ว่าง: {room.qty} ห้อง</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--meow-orange-deep)' }}>฿{room.price.toLocaleString()}/คืน</strong>
                <span onClick={() => handleRemoveRoom(room.id)} style={{ fontSize: '0.8rem', color: 'var(--meow-danger)', cursor: 'pointer' }}>ลบทิ้ง</span>
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--meow-muted)', fontSize: '0.9rem' }}>ยังไม่มีห้องพัก</p>
          )}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button className="meow-btn meow-btn-primary" onClick={handleSave} style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '1rem' }}>
            บันทึกการตั้งค่าที่พัก
          </button>
          
          <button 
            className="meow-btn" 
            onClick={() => {
              if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโรงแรม/ที่พักนี้? ข้อมูลทั้งหมดจะถูกลบถาวร')) {
                alert('ลบที่พักเรียบร้อยแล้ว');
                navigate('/sell-dashboard');
              }
            }} 
            style={{ padding: '14px', borderRadius: '12px', fontSize: '1rem', background: '#fff', color: '#dc3545', border: '1px solid #dc3545' }}>
            🗑️ ลบที่พัก
          </button>
        </div>
      </div>
    </MobileShell>
  )
}
