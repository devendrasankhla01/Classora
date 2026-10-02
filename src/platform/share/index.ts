/** Share platform adapter: Web Share API with a clipboard fallback. */
import { files } from '../files';

export const share = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  },

  async text(payload: { title: string; text: string }): Promise<'shared' | 'copied' | 'failed'> {
    if (this.isSupported()) {
      try {
        await navigator.share(payload);
        return 'shared';
      } catch {
        // User cancelled — fall through to clipboard rather than erroring.
      }
    }
    try {
      await navigator.clipboard.writeText(payload.text);
      return 'copied';
    } catch {
      return 'failed';
    }
  },

  async file(input: { filename: string; contents: string; mimeType: string; title: string }): Promise<boolean> {
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      const file = new File([input.contents], input.filename, { type: input.mimeType });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: input.title });
          return true;
        } catch {
          /* fall back to download */
        }
      }
    }
    return files.save(input);
  },
};
