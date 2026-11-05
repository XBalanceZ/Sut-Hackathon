import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import BottomNav from '../../components/layout/BottomNav'
import './marketplace.css'

const mockClinics = [
  {
    id: 1,
    name: 'โปรแกรมตรวจสุขภาพประจำปี (Cat Checkup)',
    clinicName: 'PetSmile Clinic',
    distance: '1.2 กม.',
    rating: 4.9,
    reviews: 128,
    price: 1290,
    originalPrice: 2500,
    tags: ['🩺 ตรวจเลือด', '🩻 เอกซเรย์', '💉 วัคซีนรวม'],
    duration: 'ประมาณ 45-60 นาที',
    validity: 'ใช้สิทธิ์ได้ภายใน 90 วันหลังชำระเงิน',
    included: [
      'ตรวจร่างกายทั่วไปโดยสัตวแพทย์',
      'ตรวจเลือด CBC เพื่อดูเม็ดเลือดแดง เม็ดเลือดขาว และเกล็ดเลือด',
      'ตรวจค่าตับและค่าไตเบื้องต้น',
      'เอกซเรย์ช่องอกหรือช่องท้อง 1 จุดตามดุลยพินิจสัตวแพทย์',
      'วัคซีนรวมแมว 1 เข็ม',
      'สมุดบันทึกสุขภาพและใบสรุปผลตรวจ',
    ],
    preparation: [
      'งดอาหาร 6-8 ชั่วโมงก่อนตรวจเลือด',
      'สามารถให้น้ำสะอาดได้ตามปกติ',
      'นำประวัติวัคซีนหรือสมุดสุขภาพเดิมมาด้วย',
    ],
    process: [
      'ยืนยันคูปองกับพนักงานหน้าเคาน์เตอร์',
      'ชั่งน้ำหนักและซักประวัติสุขภาพ',
      'ตรวจร่างกาย เก็บเลือด และทำรายการตรวจตามแพ็กเกจ',
      'รับคำแนะนำจากสัตวแพทย์หลังผลตรวจพร้อม',
    ],
    terms: [
      'ราคานี้ไม่รวมค่ายาเพิ่มเติมหากพบความผิดปกติ',
      'ควรจองเวลาล่วงหน้าก่อนเข้ารับบริการ',
      'ไม่สามารถแลกเป็นเงินสดได้',
    ],
  },
  {
    id: 2,
    name: 'แพ็กเกจทำหมันแมวตัวผู้ (รวมยาสลบ+ฝาก 1 คืน)',
    clinicName: 'Happy Paws Animal Hospital',
    distance: '3.5 กม.',
    rating: 4.8,
    reviews: 245,
    price: 1590,
    originalPrice: 3000,
    tags: ['✂️ ทำหมัน', '💊 รวมยา', '🛏️ ฝาก 1 คืน'],
    duration: 'ฝากน้องประมาณ 1 คืน',
    validity: 'ใช้สิทธิ์ได้ภายใน 60 วันหลังชำระเงิน',
    included: [
      'ตรวจร่างกายก่อนวางยาสลบ',
      'ค่ายาสลบและค่าผ่าตัดทำหมันแมวตัวผู้',
      'ยาลดปวดและยาปฏิชีวนะตามแผนการรักษา',
      'ฝากดูอาการ 1 คืนหลังผ่าตัด',
      'ติดตามอาการหลังผ่าตัดเบื้องต้น',
    ],
    preparation: [
      'งดอาหาร 8 ชั่วโมงก่อนผ่าตัด',
      'งดน้ำ 2 ชั่วโมงก่อนผ่าตัด',
      'น้องควรมีสุขภาพแข็งแรงและไม่มีไข้',
    ],
    process: [
      'เช็กอินและตรวจร่างกายก่อนผ่าตัด',
      'วางยาสลบและทำหัตถการโดยสัตวแพทย์',
      'พักฟื้นในพื้นที่ดูแลหลังผ่าตัด',
      'รับน้องกลับพร้อมคำแนะนำการดูแลแผล',
    ],
    terms: [
      'หากตรวจพบความเสี่ยง อาจมีค่าเลือดหรือค่ารักษาเพิ่มเติม',
      'แพ็กเกจนี้สำหรับแมวตัวผู้เท่านั้น',
      'ควรใส่ปลอกคอกันเลียหลังผ่าตัดตามคำแนะนำแพทย์',
    ],
  },
]

export default function ClinicCoursesPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด')
  const [localCourses, setLocalCourses] = useState(() => JSON.parse(localStorage.getItem('clinicCourses') || '[]'))
  const clinicCourses = [...localCourses, ...mockClinics]

  const handleDeleteCourse = (id) => {
    if (window.confirm('ต้องการลบคอร์สคลินิกนี้ใช่หรือไม่?')) {
      const updated = localCourses.filter(c => c.id !== id)
      setLocalCourses(updated)
      localStorage.setItem('clinicCourses', JSON.stringify(updated))
    }
  }

  const handleBook = (course) => {
    navigate('/checkout', {
      state: {
        itemType: 'clinic',
        itemDetails: {
          name: course.name,
          price: course.price,
          clinicName: course.clinicName,
          tags: course.tags,
          duration: course.duration,
          validity: course.validity,
          included: course.included,
          preparation: course.preparation,
          process: course.process,
          terms: course.terms,
        },
      },
    })
  }

  return (
    <MobileShell title="คลินิกและคอร์สสุขภาพ" onBack={() => navigate(-1)}>
      <div className="hotel-page">
        <section className="hotel-booking-card" style={{ background: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)', color: '#0a192f' }}>
          <div className="hotel-booking-header">
            <div>
              <h2 style={{ color: '#0a192f' }}>ดูแลสุขภาพน้องแมว</h2>
              <p style={{ color: '#2c3e50' }}>แพ็กเกจตรวจสุขภาพ ทำหมัน วัคซีน จากคลินิกชั้นนำ</p>
            </div>
            <span aria-hidden="true">🏥</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/clinic-scan')}
            style={{
              width: '100%',
              marginTop: '14px',
              padding: '12px',
              border: 'none',
              borderRadius: '14px',
              background: '#fff',
              color: '#0a4f78',
              fontWeight: 800,
              fontSize: '0.94rem',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(41, 128, 185, 0.14)',
            }}
          >
            สแกน QR / Barcode คูปองคลินิก
          </button>
        </section>

        <div className="hotel-filter-row">
          {['ทั้งหมด', 'ตรวจสุขภาพ', 'ทำหมัน', 'วัคซีน', 'ใกล้ฉัน'].map(filter => (
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
          {clinicCourses.map(course => (
            <article key={course.id} className="hotel-card">
              <div className="hotel-info">
                <div className="hotel-title-row">
                  <h3 style={{ fontSize: '1.05rem', lineHeight: '1.4' }}>{course.name}</h3>
                </div>
                
                <p style={{ margin: '4px 0 12px', color: 'var(--meow-orange-deep)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  ฿{course.price.toLocaleString()} 
                  <span style={{ fontSize: '0.8rem', color: '#999', textDecoration: 'line-through', marginLeft: '6px', fontWeight: 'normal' }}>฿{course.originalPrice.toLocaleString()}</span>
                </p>

                <p className="hotel-meta" style={{ marginBottom: '12px' }}>
                  🏥 {course.clinicName} · {course.distance} · ★ {course.rating} ({course.reviews})
                </p>

                <div className="hotel-tags">
                  {course.tags.map(tag => (
                    <span key={tag} style={{ background: '#eaf2f8', color: '#2980b9' }}>{tag}</span>
                  ))}
                </div>

                <div className="hotel-actions">
                  {typeof course.id === 'string' && course.id.startsWith('local-clinic-') && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteCourse(course.id)}
                      style={{ background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ลบ
                    </button>
                  )}
                  <button type="button" className="hotel-book-btn" style={{ background: 'linear-gradient(135deg, #2980b9, #6dd5ed)', boxShadow: '0 4px 12px rgba(41, 128, 185, 0.2)', flex: 1 }} onClick={() => handleBook(course)}>
                    ซื้อแพ็กเกจ
                  </button>
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
