import './CameraFaceOverlay.css'

const ANGLES = [
  { id: 0, label: 'หน้าตรง' },
  { id: 1, label: 'ซ้าย 45°' },
  { id: 2, label: 'ซ้าย 90°' },
  { id: 3, label: 'หลัง' },
  { id: 4, label: 'ขวา 90°' },
  { id: 5, label: 'ขวา 45°' },
  { id: 6, label: 'เงย' },
  { id: 7, label: 'ก้ม' },
]

export default function CameraFaceOverlay({
  children,
  capturedAngles = [],
  onCaptureAngle,
  scanning = false,
}) {
  const progress = Math.round((capturedAngles.length / ANGLES.length) * 100)

  return (
    <div className="camera-viewport">
      <div className="camera-feed">
        {children}
        <div className="yolo-grid" aria-hidden="true">
          <div className="grid-line h1" />
          <div className="grid-line h2" />
          <div className="grid-line v1" />
          <div className="grid-line v2" />
          <div className="face-oval" />
          <span className="landmark landmark-ear-l" title="หูซ้าย" />
          <span className="landmark landmark-ear-r" title="หูขวา" />
          <span className="landmark landmark-eye-l" title="ตาซ้าย" />
          <span className="landmark landmark-eye-r" title="ตาขวา" />
          <span className="landmark landmark-nose" title="จมูก" />
          {scanning && <div className="scan-beam" />}
        </div>
        <div className="yolo-badge">YOLOv5-Face</div>
      </div>

      <div className="angle-progress">
        <div className="progress-ring">
          <svg viewBox="0 0 36 36">
            <path
              className="ring-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="ring-fill"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="progress-text">{progress}%</span>
        </div>
        <p className="angle-hint">ถ่ายรอบ 360° — {capturedAngles.length}/{ANGLES.length} มุม</p>
      </div>

      <div className="angle-chips">
        {ANGLES.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`angle-chip${capturedAngles.includes(a.id) ? ' done' : ''}`}
            onClick={() => onCaptureAngle?.(a.id)}
          >
            {capturedAngles.includes(a.id) ? '✓' : a.id + 1} {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { ANGLES }
