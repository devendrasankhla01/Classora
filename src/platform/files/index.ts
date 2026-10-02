/** File platform adapter: download on web, share sheet on native. */
export interface SaveFileInput {
  filename: string;
  contents: string | Blob;
  mimeType: string;
}

export const files = {
  async save({ filename, contents, mimeType }: SaveFileInput): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    const blob = typeof contents === 'string' ? new Blob([contents], { type: mimeType }) : contents;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give Safari a beat before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  },
};
