// Position de lecture de chaque vidéo, gardée le temps de la session :
// passer du fil à la publication, ou au plein écran, reprend là où on en était.
// ponytail: en mémoire seulement, perdue au rechargement de la page ; sessionStorage si besoin.
const positions = new Map<string, { time: number; playing: boolean }>();

export function savePosition(id: string, video: HTMLVideoElement | null, playing = video ? !video.paused && !video.ended : false) {
  // Vidéo pas encore chargée (readyState 0) : rien à noter, et surtout ne pas écraser la position gardée par 0.
  if (video && video.readyState > 0) positions.set(id, { time: video.currentTime, playing });
}

export function restorePosition(id: string, video: HTMLVideoElement | null) {
  const saved = positions.get(id);
  if (!video || !saved) return;
  video.currentTime = saved.time;
  // Le navigateur peut refuser une lecture qui ne suit pas un geste : la vidéo reste alors en pause, au bon endroit.
  if (saved.playing) video.play().catch(() => {});
}
