import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'idle' | 'prepare' | 'work' | 'rest' | 'finished'

const PREPARE_SECONDS = 5
const WORK_SECONDS = 20
const REST_SECONDS = 10
const TOTAL_SETS = 8

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'スタート待ち',
  prepare: '準備',
  work: '運動中',
  rest: '休憩中',
  finished: '終了',
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 1.05
  window.speechSynthesis.speak(utterance)
}

function formatSeconds(seconds: number) {
  return String(seconds).padStart(2, '0')
}

function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(PREPARE_SECONDS)
  const [currentSet, setCurrentSet] = useState(1)
  const [isRunning, setIsRunning] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const voiceOnRef = useRef(voiceOn)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    voiceOnRef.current = voiceOn
  }, [voiceOn])

  const announce = useCallback((text: string) => {
    if (voiceOnRef.current) speak(text)
  }, [])

  // カウントダウン本体
  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'finished') return
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRunning, phase])

  // secondsLeftが0になった瞬間にフェーズを遷移させる（1回だけ発火）
  useEffect(() => {
    if (!isRunning || secondsLeft !== 0) return

    if (phase === 'prepare') {
      announce('スタート')
      setPhase('work')
      setSecondsLeft(WORK_SECONDS)
    } else if (phase === 'work') {
      announce('休憩スタート')
      setPhase('rest')
      setSecondsLeft(REST_SECONDS)
    } else if (phase === 'rest') {
      if (currentSet >= TOTAL_SETS) {
        announce('休憩終了。お疲れ様でした。')
        setPhase('finished')
        setIsRunning(false)
      } else {
        announce('休憩終了')
        setCurrentSet((s) => s + 1)
        setPhase('work')
        setSecondsLeft(WORK_SECONDS)
      }
    }
  }, [secondsLeft, isRunning, phase, currentSet, announce])

  // 画面スリープ防止
  useEffect(() => {
    const canLock = 'wakeLock' in navigator
    if (!canLock) return

    if (isRunning) {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          wakeLockRef.current = lock
        })
        .catch(() => {})
    } else {
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }

    return () => {
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [isRunning])

  const handleStart = () => {
    if (phase === 'idle' || phase === 'finished') {
      setPhase('prepare')
      setSecondsLeft(PREPARE_SECONDS)
      setCurrentSet(1)
      announce('準備してください')
    }
    setIsRunning(true)
  }

  const handlePause = () => setIsRunning(false)

  const handleReset = () => {
    window.speechSynthesis.cancel()
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(PREPARE_SECONDS)
    setCurrentSet(1)
  }

  const bgClass =
    phase === 'work'
      ? 'bg-red-600'
      : phase === 'rest'
        ? 'bg-sky-700'
        : phase === 'prepare'
          ? 'bg-amber-600'
          : phase === 'finished'
            ? 'bg-emerald-700'
            : 'bg-slate-900'

  return (
    <div
      className={`min-h-svh flex flex-col items-center justify-between px-6 py-10 text-white transition-colors duration-500 ${bgClass}`}
    >
      <header className="text-center">
        <h1 className="text-lg font-bold tracking-widest text-white/80">
          タバタタイマー
        </h1>
        <p className="mt-1 text-sm text-white/60">
          20秒運動 + 10秒休憩 × 8セット
        </p>
      </header>

      <main className="flex flex-col items-center gap-6">
        <div className="text-2xl font-bold tracking-wide text-white/90">
          {PHASE_LABEL[phase]}
        </div>

        <div className="font-black tabular-nums leading-none text-[7rem] sm:text-[9rem] drop-shadow-lg">
          {formatSeconds(secondsLeft)}
        </div>

        <div className="text-xl font-semibold text-white/90">
          SET {Math.min(currentSet, TOTAL_SETS)} / {TOTAL_SETS}
        </div>

        <div className="mt-2 flex w-64 gap-1.5">
          {Array.from({ length: TOTAL_SETS }, (_, i) => i + 1).map((set) => (
            <div
              key={set}
              className={`h-2 flex-1 rounded-full ${
                set < currentSet || phase === 'finished'
                  ? 'bg-white'
                  : set === currentSet
                    ? 'bg-white/70'
                    : 'bg-white/25'
              }`}
            />
          ))}
        </div>
      </main>

      <footer className="flex w-full max-w-xs flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-white px-10 py-4 text-lg font-bold text-slate-900 shadow-lg active:scale-95 transition"
            >
              {phase === 'idle' || phase === 'finished' ? 'スタート' : '再開'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-full bg-white px-10 py-4 text-lg font-bold text-slate-900 shadow-lg active:scale-95 transition"
            >
              一時停止
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/50 px-6 py-4 text-base font-semibold text-white/90 active:scale-95 transition"
          >
            リセット
          </button>
        </div>

        <button
          type="button"
          onClick={() => setVoiceOn((v) => !v)}
          className="text-sm font-medium text-white/70 underline underline-offset-4"
        >
          音声お知らせ: {voiceOn ? 'ON' : 'OFF'}
        </button>
      </footer>
    </div>
  )
}

export default App
