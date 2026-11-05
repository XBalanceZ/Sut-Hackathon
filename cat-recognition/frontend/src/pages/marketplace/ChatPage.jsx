import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import './marketplace.css' // Reuse styles if any

export default function ChatPage() {
  const { sellerId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { id: 1, text: "สวัสดีครับ สนใจน้องแมวตัวนี้ครับ", sender: 'me', time: "10:00" },
    { id: 2, text: "สวัสดีค่ะ น้องยังว่างนะคะ สามารถนัดดูตัวได้ค่ะ", sender: 'shop', time: "10:02" }
  ])
  const [inputText, setInputText] = useState('')
  const [orderStatus, setOrderStatus] = useState('holding') // holding, completed
  const simulatedPrice = 10000 // mock price
  const simulatedFee = simulatedPrice * 0.05 // 5% fee for cats

  const role = localStorage.getItem('mockRole') || 'buyer'
  const otherPartyName = role === 'buyer' ? 'Meow Paradise Hotel' : 'คุณใจดี รักแมว'
  const title = role === 'buyer' ? 'แชทกับร้านค้า' : 'คุยกับลูกค้า'

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    
    setMessages([...messages, { 
      id: Date.now(), 
      text: inputText.trim(), 
      sender: 'me', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }])
    setInputText('')
  }

  // Scroll to bottom effect
  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight)
  }, [messages])

  return (
    <MobileShell title={title} onBack={() => navigate(-1)} noNav>
      
      {/* Show Customer/Shop Info */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--meow-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--meow-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
          {role === 'buyer' ? '🏪' : '🧑'}
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '0.95rem' }}>{otherPartyName}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--meow-muted)' }}>
            {role === 'buyer' ? 'ตอบกลับภายใน 5 นาที' : 'ลูกค้าสนใจ: แมวสก็อตติชโฟลด์'}
          </span>
        </div>
      </div>

      {/* Escrow Status Banner */}
      {orderStatus === 'holding' ? (
        <div style={{ background: '#fff3cd', padding: '12px 16px', borderBottom: '1px solid #ffeeba', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div>
            <strong style={{ fontSize: '0.85rem', color: '#856404', display: 'block' }}>🛡️ เงินถูกพักไว้ในระบบอย่างปลอดภัย</strong>
            <span style={{ fontSize: '0.75rem', color: '#856404' }}>กรุณากดรับแมวเมื่อได้รับน้องแล้วเท่านั้น</span>
          </div>
          <button 
            className="meow-btn meow-btn-primary" 
            style={{ padding: '8px 12px', fontSize: '0.8rem', width: 'auto', borderRadius: '8px' }}
            onClick={() => {
              if (window.confirm('คุณได้รับแมวเรียบร้อยแล้ว และต้องการโอนเงินให้ผู้ขายใช่หรือไม่?')) {
                setOrderStatus('completed')
                setMessages(prev => [...prev, {
                  id: Date.now(),
                  isSystem: true,
                  text: `✅ ผู้ซื้อยืนยันการรับแมวแล้ว\n💰 แพลตฟอร์มได้โอนเงิน ฿${(simulatedPrice - simulatedFee).toLocaleString()} ให้ผู้ขายแล้ว (หักค่าธรรมเนียม 5% = ฿${simulatedFee.toLocaleString()})`
                }])
              }
            }}
          >
            ✅ ฉันได้รับแมวแล้ว
          </button>
        </div>
      ) : (
        <div style={{ background: '#d4edda', padding: '10px 16px', borderBottom: '1px solid #c3e6cb', textAlign: 'center', zIndex: 10 }}>
          <strong style={{ fontSize: '0.85rem', color: '#155724' }}>✅ รายการเสร็จสมบูรณ์ โอนเงินให้ผู้ขายแล้ว</strong>
        </div>
      )}

      <div style={{ padding: '12px', paddingBottom: '70px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {messages.map(msg => (
          <div key={msg.id} style={{ 
            alignSelf: msg.isSystem ? 'center' : (msg.sender === 'me' ? 'flex-end' : 'flex-start'),
            maxWidth: msg.isSystem ? '90%' : '75%'
          }}>
            <div style={{
              background: msg.isSystem ? '#e8f4fd' : (msg.sender === 'me' ? 'var(--meow-purple)' : '#e4e6eb'),
              color: msg.isSystem ? '#004085' : (msg.sender === 'me' ? '#fff' : '#050505'),
              padding: '10px 14px',
              borderRadius: msg.isSystem ? '12px' : (msg.sender === 'me' ? '18px 18px 2px 18px' : '18px 18px 18px 2px'),
              fontSize: '0.95rem',
              lineHeight: '1.4',
              border: msg.isSystem ? '1px solid #b8daff' : 'none',
              textAlign: msg.isSystem ? 'center' : 'left',
              whiteSpace: 'pre-line'
            }}>
              {msg.text}
            </div>
            {!msg.isSystem && (
              <div style={{ 
                fontSize: '0.7rem', 
                color: 'var(--meow-muted)', 
                marginTop: '4px',
                textAlign: msg.sender === 'me' ? 'right' : 'left'
              }}>
                {msg.time}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat Input Area */}
      <form onSubmit={handleSend} style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderTop: '1px solid var(--meow-border)',
        padding: '10px 12px env(safe-area-inset-bottom)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 100
      }}>
        <input 
          type="text" 
          placeholder="พิมพ์ข้อความ..." 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: '1px solid var(--meow-border)',
            background: '#f0f2f5',
            outline: 'none',
            fontSize: '0.95rem'
          }}
        />
        <button type="submit" style={{
          background: 'var(--meow-orange)',
          color: '#fff',
          border: 'none',
          width: '44px',
          height: '44px',
          borderRadius: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          cursor: 'pointer'
        }}>
          🚀
        </button>
      </form>
    </MobileShell>
  )
}
