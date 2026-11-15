// Partage natif (feuille de partage iOS / Android) ; sur ordinateur, copie du lien.
// Renvoie « copied » quand le lien a été copié, pour afficher une confirmation.
export async function shareLink(title: string, path: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = `${location.origin}${path}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
