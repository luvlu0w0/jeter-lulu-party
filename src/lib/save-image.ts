export async function saveInvitationImage(file: File | null): Promise<'shared' | 'downloaded' | 'cancelled' | 'preview'> {
  const mobile = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  if (mobile) {
    try {
      if (file && navigator.share && navigator.canShare?.({files: [file]})) {
        // The file is prepared before the tap so Safari retains user activation.
        await navigator.share({files: [file]});
        return 'shared';
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
    // Embedded browsers may deny sharing: leave a real image available to long-press.
    return 'preview';
  }
  const link = document.createElement('a');
  link.href = './assets/party-information.png';
  link.download = 'Jeter-Lulu-派對資訊.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return 'downloaded';
}
