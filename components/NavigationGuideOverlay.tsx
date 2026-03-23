"use client"

import type { CSSProperties } from "react"
import { ArrowLeft, ArrowRight, Check, PartyPopper, SkipForward } from "lucide-react"
import { NavigationGuideStep } from "@/hooks/useNavigationGuide"

interface ConfettiPiece {
  id: number
  left: string
  delay: string
  duration: string
  color: string
}

interface NavigationGuideOverlayProps {
  showGuide: boolean
  activeRect: DOMRect | null
  activeStep?: NavigationGuideStep
  stepIndex: number
  totalSteps: number
  showConfetti: boolean
  confettiPieces: ConfettiPiece[]
  onPrevious: () => void
  onNext: () => void
  onSkip: () => void
}

export default function NavigationGuideOverlay({
  showGuide,
  activeRect,
  activeStep,
  stepIndex,
  totalSteps,
  showConfetti,
  confettiPieces,
  onPrevious,
  onNext,
  onSkip,
}: NavigationGuideOverlayProps) {
  return (
    <>
      {showConfetti ? (
        <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece absolute top-[-10%] h-4 w-2 rounded-full"
              style={
                {
                  left: piece.left,
                  backgroundColor: piece.color,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      <style jsx global>{`
        @keyframes skyassess-confetti-fall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 110vh, 0) rotate(540deg);
            opacity: 0;
          }
        }

        .confetti-piece {
          animation-name: skyassess-confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
      `}</style>

      {showGuide && activeStep ? (
        <div className="fixed inset-0 z-[110]">
          <div className="absolute inset-0 bg-slate-950/65" />
          {activeRect ? (
            <div
              className="absolute rounded-3xl border-2 border-sky-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.65)] transition-all duration-300"
              style={{
                top: activeRect.top - 8,
                left: activeRect.left - 8,
                width: activeRect.width + 16,
                height: activeRect.height + 16,
              }}
            />
          ) : null}

          <div className="absolute bottom-6 left-1/2 w-[min(92vw,26rem)] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-800">
                  Guided Navigation {stepIndex + 1}/{totalSteps}
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-900">{activeStep.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeStep.description}</p>
              </div>
              <PartyPopper className="mt-1 h-5 w-5 text-blue-900" />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 hover:bg-slate-50"
              >
                <SkipForward size={14} />
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-blue-800"
                >
                  {stepIndex === totalSteps - 1 ? (
                    <>
                      <Check size={14} />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
