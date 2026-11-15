// Clavier virtuel : sur iPhone, il recouvre la page sans la redimensionner.
// On mesure la partie cachée (visualViewport) et on l'expose en --kb-inset :
// les barres de saisie collées en bas remontent d'autant et restent visibles.
// Sur Android, la balise viewport « interactive-widget=resizes-content » redimensionne déjà la page.

function isTextField(element: Element | null) {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) return !['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image'].includes(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

export function startKeyboardInset(): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const root = document.documentElement;

  const sync = () => {
    if (vv.scale > 1) return; // zoom par pincement : on ne poursuit pas l'utilisateur
    const hidden = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    const open = hidden > 80 && isTextField(document.activeElement);
    root.style.setProperty('--kb-inset', `${open ? hidden : 0}px`);
    root.classList.toggle('kb-open', open);
  };

  // Le clavier met environ 300 ms à s'ouvrir : on remesure une fois l'animation finie.
  const onFocus = (event: FocusEvent) => {
    if (!isTextField(event.target as Element)) return;
    sync();
    window.setTimeout(sync, 320);
  };
  const onBlur = () => window.requestAnimationFrame(sync);

  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onBlur);
  sync();
  return () => {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('focusout', onBlur);
  };
}
