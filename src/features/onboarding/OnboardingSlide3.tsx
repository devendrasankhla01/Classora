import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/controls';

interface OnboardingSlide3Props {
  onGetStarted: () => void;
}

export function OnboardingSlide3({ onGetStarted }: OnboardingSlide3Props) {
  return (
    <div className="flex flex-col items-center justify-between text-center min-h-full w-full max-w-app mx-auto px-4 py-2 sm:py-4">
      {/* Header Badge */}
      <div className="flex flex-col items-center space-y-2 animate-fade-in">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-label-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 text-amber-800 border border-amber-300/60 shadow-2xs">
          <Icon name="code" size={14} className="text-indigo-600" />
          Developer Shout-Out
        </span>

        <h1 className="text-headline-lg sm:text-display-lg font-extrabold text-slate-900 tracking-tight leading-tight mt-1">
          Made with Passion.{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 bg-clip-text text-transparent">
            Built with Purpose.
          </span>
        </h1>
      </div>

      {/* Developer Hero Card */}
      <div className="w-full my-3 sm:my-5 animate-rise-in">
        <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-5 sm:p-6 text-white border border-indigo-400/30 shadow-2xl text-left">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          {/* Card Top Section: Avatar & Badges */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-extrabold text-lg text-white font-mono tracking-wider">
                  DS
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900">
                <Icon name="verified" size={12} filled />
              </span>
            </div>

            <div>
              <h3 className="text-headline-md font-extrabold tracking-tight text-white flex items-center gap-2">
                Devendra Sankhla
              </h3>
              <p className="text-label-xs font-semibold text-indigo-200/90 mt-0.5 flex items-center gap-1">
                <Icon name="school" size={13} className="text-indigo-400" />
                3rd Semester • Computer Science & Engineering
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Built by Devendra Sankhla
              </span>
            </div>
          </div>

          {/* Creator Statement */}
          <p className="text-body-sm sm:text-body-md text-slate-300 leading-relaxed font-normal mb-4 border-l-2 border-amber-400/70 pl-3">
            CampusOne is proudly built by <strong className="text-white font-semibold">Devendra Sankhla</strong>, a 3rd-semester Computer Science & Engineering student — designed to give college students total clarity, peace of mind, and control over their academic life.
          </p>

          {/* Core Pillars */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Icon name="security" size={14} className="text-emerald-400" />
              100% On-Device Privacy
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Icon name="bolt" size={14} className="text-amber-400" />
              Live Safety Projections
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Icon name="schedule" size={14} className="text-indigo-400" />
              Section A Auto-Schedule
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <Icon name="sync_saved_locally" size={14} className="text-purple-400" />
              Offline-First Architecture
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Get Started CTA Button */}
      <div className="w-full max-w-app space-y-2 mt-2">
        <Button
          type="button"
          variant="primary"
          block
          onClick={onGetStarted}
          trailingIcon="arrow_forward"
          className="btn-3d-primary !py-3.5 !text-headline-sm !font-bold shadow-lg shadow-indigo-500/25"
        >
          Get Started with CampusOne
        </Button>
        <p className="text-[11px] text-slate-400 font-medium">
          Ready to experience Section A's academic assistant?
        </p>
      </div>
    </div>
  );
}
