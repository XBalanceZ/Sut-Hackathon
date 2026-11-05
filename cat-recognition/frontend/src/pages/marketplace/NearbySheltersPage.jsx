import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

const mockHotels = [
  {
    id: 1,
    name: 'Sky Paw Cat Hotel',
    distance: '2.4 กม.',
    capacity: 18,
    reviews: 320,
    rating: 4.9,
    price: 450,
    phone: '021234567',
    address: 'ลาดพร้าว, กรุงเทพฯ',
    mapUrl: 'https://maps.google.com/?q=Sky%20Paw%20Cat%20Hotel%20Lat%20Phrao%20Bangkok',
    tags: ['🏥 คลินิก', '🍽️ อาหาร', '🛏️ ห้องพัก', '🎮 พื้นที่เล่น'],
  },
  {
    id: 2,
    name: 'Meow Paradise Resort',
    distance: '5.1 กม.',
    capacity: 10,
    reviews: 156,
    rating: 4.8,
    price: 590,
    phone: '029876543',
    address: 'เอกมัย, กรุงเทพฯ',
    mapUrl: 'https://maps.google.com/?q=Meow%20Paradise%20Resort%20Ekkamai%20Bangkok',
    tags: ['❄️ แอร์ 24 ชม.', '📷 ดูกล้อง', '🐟 อาหาร'],
  },
]

export default function NearbySheltersPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('Rating 4.8+')

  const handleBook = (hotel) => {
    navigate('/checkout', {
      state: {
        itemType: 'hotel',
        itemDetails: {
          name: hotel.name,
          price: hotel.price,
          tags: hotel.tags,
        },
      },
    })
  }

  return (
    <MobileShell title="โรงแรมแมว" onBack={() => navigate(-1)}>
      <div className="hotel-page">
        <section className="hotel-booking-card">
          <div className="hotel-booking-header">
            <div>
              <h2>ค้นหาที่พักให้น้อง</h2>
              <p>เลือกวันเข้าพัก จำนวนแมว และประเภทห้องก่อนจอง</p>
            </div>
            <span aria-hidden="true">🏨</span>
          </div>

          <div className="hotel-form-grid">
            <label>
              วันเช็คอิน
              <input type="date" defaultValue="2026-06-10" />
            </label>
            <label>
              วันเช็คเอาต์
              <input type="date" defaultValue="2026-06-13" />
            </label>
            <label>
              จำนวนแมว
              <select defaultValue="1 ตัว">
                <option>1 ตัว</option>
                <option>2 ตัว</option>
                <option>3+ ตัว</option>
              </select>
            </label>
            <label>
              ประเภทห้อง
              <select defaultValue="ห้องเดี่ยว">
                <option>ห้องเดี่ยว</option>
                <option>ห้องรวม</option>
                <option>VIP</option>
              </select>
            </label>
          </div>
        </section>

        <div className="hotel-filter-row">
          {['ราคา', 'Rating 4.8+', 'ใกล้ที่สุด', 'ห้องใหญ่'].map(filter => (
            <button
              key={filter}
              type="button"
              className={activeFilter === filter ? 'active' : ''}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <section className="hotel-list">
          {mockHotels.map(hotel => (
            <article key={hotel.id} className="hotel-card">
              <div className="hotel-image">
                <div className="hotel-house" aria-hidden="true">
                  <span />
                  <span />
                  <b />
                </div>
                <div className="hotel-rating">★ {hotel.rating}</div>
              </div>

              <div className="hotel-info">
                <div className="hotel-title-row">
                  <h3>{hotel.name}</h3>
                  <strong>฿{hotel.price.toLocaleString()}/คืน</strong>
                </div>

                <p className="hotel-meta">
                  {hotel.address} · {hotel.distance} · รับได้ {hotel.capacity} ตัว · {hotel.reviews} รีวิว
                </p>

                <div className="hotel-tags">
                  {hotel.tags.map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="hotel-actions">
                  <button type="button" className="hotel-book-btn" onClick={() => handleBook(hotel)}>
                    จอง
                  </button>
                  <a className="hotel-action-btn" href={hotel.mapUrl} target="_blank" rel="noreferrer">
                    นำทาง
                  </a>
                  <a className="hotel-action-btn" href={`tel:${hotel.phone}`}>
                    โทร
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
      <BottomNav />
    </MobileShell>
  )
}
