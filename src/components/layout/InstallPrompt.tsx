import { useState } from 'react';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/controls';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/**
 * "Add to Home Screen" invitation.
 *
 * Hidden once installed or dismissed, and it never blocks the app: installation
 * is an upgrade, not a gate. On iOS it explains the real Safari steps, because
 * the platform offers no programmatic prompt.
 */
export function InstallPrompt() {
  const { isInstalled, canPrompt, needsManualSteps, dismissed, promptInstall, dismiss } =
    useInstallPrompt();
  const announce = useClassora((state) => state.announce);
  const ready = useClassora((state) => state.ready);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Give the student a moment in the app before asking for anything.
  if (!ready || isInstalled || dismissed) return null;
  if (!canPrompt && !needsManualSteps) return null;

  return (
    <>
      <div className="px-5 pb-1 pt-2">
        <div className="flex items-center gap-3.5 rounded-card bg-gradient-to-r from-brand-50 to-surface p-4 shadow-ambient ring-1 ring-brand-500/10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-ambient">
            <Icon name="install_mobile" size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold leading-tight">Install Classora</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-secondary">
              Works offline, opens full screen, no app store needed.
            </p>
          </div>

          <button
            type="button"
            aria-label="Dismiss install invitation"
            onClick={dismiss}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted"
          >
            <Icon name="close" size={17} />
          </button>

          <button
            type="button"
            onClick={async () => {
              if (canPrompt) {
                const outcome = await promptInstall();
                if (outcome === 'accepted') {
                  announce({ tone: 'success', message: 'Classora added to your home screen' });
                }
                return;
              }
              setSheetOpen(true);
            }}
            className={cn(
              'shrink-0 rounded-pill bg-brand-600 px-3.5 py-2 text-[12.5px] font-bold text-white',
              'transition active:scale-95',
            )}
          >
            Add
          </button>
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add Classora to your Home Screen"
        description="Safari needs two taps — Apple does not allow apps to install themselves."
        footer={
          <Button block variant="secondary" onClick={() => setSheetOpen(false)}>
            Got it
          </Button>
        }
      >
        <ol className="space-y-3.5 pt-1">
          <Step
            icon="ios_share"
            title="Tap the Share button"
            detail="The square with an arrow, in Safari's toolbar."
          />
          <Step
            icon="add_box"
            title="Choose “Add to Home Screen”"
            detail="Scroll the share sheet list if you do not see it straight away."
          />
          <Step
            icon="check_circle"
            title="Tap “Add”"
            detail="Classora then opens full screen and works with no signal."
          />
        </ol>
        <p className="mt-4 rounded-block bg-surface-muted p-3.5 text-[12px] leading-relaxed text-ink-secondary">
          Your attendance data stays on this device in local mode — installing does not send anything anywhere.
        </p>
      </BottomSheet>
    </>
  );
}

function Step({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold leading-tight">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-secondary">{detail}</span>
      </span>
    </li>
  );
}
