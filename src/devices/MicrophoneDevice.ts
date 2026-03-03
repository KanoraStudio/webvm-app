export class MicrophoneDevice {
  private audioCtx: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null
  private pcmBuffer: Float32Array[] = []

  constructor(private emulator: any) {}

  async initialize(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      })

      this.audioCtx   = new AudioContext({ sampleRate: 44100 })
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream)

      // 4096サンプル単位でPCMキャプチャ
      this.processorNode = this.audioCtx.createScriptProcessor(4096, 1, 1)
      this.processorNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        this.pcmBuffer.push(new Float32Array(input))
        if (this.pcmBuffer.length > 10) this.flushToGuest()
      }

      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioCtx.destination)

      console.log('[Mic] 初期化成功: 44100Hz mono')
      return true
    } catch (e) {
      console.error('[Mic] アクセス失敗:', e)
      return false
    }
  }

  private flushToGuest(): void {
    // 蓄積PCMデータを結合して16bit PCM に変換
    const totalLen = this.pcmBuffer.reduce((s, b) => s + b.length, 0)
    const merged   = new Float32Array(totalLen)
    let offset = 0
    for (const buf of this.pcmBuffer) { merged.set(buf, offset); offset += buf.length }

    const pcm16 = new Int16Array(merged.length)
    for (let i = 0; i < merged.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, merged[i] * 32767))
    }

    // ゲストOSの仮想AC97 DMAバッファへ転送
    // （v86 の AC97エミュレーション拡張で受信される）
    if (this.emulator) {
      this.emulator.emit?.('mic-pcm-data', pcm16)
    }

    this.pcmBuffer = []
  }

  stop(): void {
    this.processorNode?.disconnect()
    this.sourceNode?.disconnect()
    this.stream?.getTracks().forEach(t => t.stop())
    this.audioCtx?.close()
    this.stream = null
    console.log('[Mic] 停止')
  }
}
