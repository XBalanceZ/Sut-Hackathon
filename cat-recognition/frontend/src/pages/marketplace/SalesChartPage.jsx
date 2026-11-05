import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css'

export default function SalesChartPage() {
  const navigate = useNavigate()

  const fakeSalesData = [
    { day: 'จ.', sales: 1200 },
    { day: 'อ.', sales: 2500 },
    { day: 'พ.', sales: 800 },
    { day: 'พฤ.', sales: 3400 },
    { day: 'ศ.', sales: 4100 },
    { day: 'ส.', sales: 2900 },
    { day: 'อา.', sales: 5200 }
  ];

  return (
    <MobileShell title="สรุปยอดขาย" onBack={() => navigate(-1)}>
      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: 'var(--meow-text)' }}>รายงานยอดขายของคุณ</h2>
        
        <div className="meow-card" style={{ marginBottom: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: 'var(--meow-muted)', fontWeight: '600' }}>ยอดขายสัปดาห์นี้</h3>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--meow-purple-deep)' }}>฿20,100</div>
            </div>
            <div style={{ padding: '6px 10px', background: '#e6f4ea', color: '#137333', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>+14%</span>
              <span style={{ fontSize: '1rem' }}>📈</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', gap: '10px' }}>
            {fakeSalesData.map((d, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                {/* Tooltip-like value */}
                <div style={{ fontSize: '0.7rem', color: 'var(--meow-muted)', marginBottom: '4px', opacity: 0.8 }}>
                  {d.sales >= 1000 ? `${(d.sales/1000).toFixed(1)}k` : d.sales}
                </div>
                {/* Bar */}
                <div style={{ 
                  width: '100%', 
                  maxWidth: '32px',
                  height: `${(d.sales / 5200) * 140}px`, 
                  background: 'linear-gradient(to top, #b57bee, #8b4fc7)',
                  borderRadius: '6px 6px 4px 4px',
                  boxShadow: '0 4px 12px rgba(139,79,199,0.2)'
                }} />
                {/* Label */}
                <span style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--meow-text)', fontWeight: '600' }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="meow-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'var(--meow-muted)' }}>คำแนะนำจากระบบ</h3>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            💡 ยอดขายวันอาทิตย์ของคุณเติบโตสูงสุด ลองเพิ่มสินค้าหรือจัดโปรโมชันในวันหยุดสุดสัปดาห์เพื่อเพิ่มยอดขาย
          </p>
          <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
            🎉 สินค้าประเภท <strong>อาหารแมว</strong> มียอดการเข้าชมสูงสุดในสัปดาห์นี้
          </p>
        </div>
      </div>
    </MobileShell>
  )
}
