import { RefObject } from 'react'

interface Props {
  containerRef: RefObject<HTMLDivElement>
  canvasRef:    RefObject<HTMLCanvasElement>
}

export const VMScreen = ({ containerRef, canvasRef }: Props) => {
  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: '#000',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(56,189,248,0.15)',
      }}
    >
      {/* v86 が自動的にここに <canvas> を挿入する */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />
    </div>
  )
}
