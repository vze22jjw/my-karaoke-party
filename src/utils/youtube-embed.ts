/**
 * Gera URL do CodePen embed para bypass de restrições do YouTube
 * Alguns vídeos do YouTube só podem ser embedados em domínios específicos.
 * CodePen está na whitelist e permite bypass dessas restrições.
 *
 * @param videoId - ID do vídeo do YouTube
 * @param params - Parâmetros adicionais do YouTube player (autoplay, mute, etc)
 * @returns URL do CodePen para embed
 *
 * @example
 * getCodePenEmbedUrl('NAo38Q9c4xA', { autoplay: 1, mute: 1 })
 * // Returns: 'https://cdpn.io/pen/debug/oNPzxKo?v=NAo38Q9c4xA&autoplay=1&mute=1'
 */
// --- REMOVED: This function is no longer needed ---
// export function getCodePenEmbedUrl(
//   videoId: string,
//   params?: Record<string, string | number>
// ): string {
//   const baseUrl = 'https://cdpn.io/pen/debug/oNPzxKo';
//   const urlParams = new URLSearchParams({ v: videoId });
// 
//   if (params) {
//     Object.entries(params).forEach(([key, value]) => {
//       urlParams.append(key, String(value));
//     });
//   }
// 
//   return `${baseUrl}?${urlParams.toString()}`;
// }

/**
 * Gera URL direta do YouTube para fallback
 */
export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Gera URL de embed padrão do YouTube
 */
export function getYouTubeEmbedUrl(
  videoId: string,
  params?: Record<string, string | number>
): string {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;

  if (params) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      urlParams.append(key, String(value));
    });
    return `${baseUrl}?${urlParams.toString()}`;
  }

  return baseUrl;
}
