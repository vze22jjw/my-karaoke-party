# YouTube Embed Restrictions / Restrições de Embed do YouTube

<details open>
<summary>🇬🇧 English</summary>

Some YouTube videos disable embedding on external sites. This app uses the `react-player` library which attempts to handle these cases intelligently.

If a video cannot be played, the Host Player will render a "Play on YouTube" button. Once clicked the YouTube link opens in a new tab or window. A timer is started to show the next song in the queue (Fair Queue rules apply). We also validate video duration and availability via the YouTube Data API before adding it to the playlist to minimize playback errors during the party.

</details>

<details>
<summary>🇧🇷 Português</summary>

Alguns vídeos do YouTube desativam a incorporação (embed) em sites externos. Este app usa a biblioteca `react-player` que tenta lidar com esses casos de forma inteligente.

Se um vídeo não puder ser reproduzido, o Host Player renderizará um botão "Play on YouTube" (Reproduzir no YouTube). Ao clicar, o link do YouTube é aberto em uma nova aba ou janela. Um cronômetro é iniciado para mostrar a próxima música na fila (aplicam-se as regras de Fila Justa). Também validamos a duração e a disponibilidade do vídeo via YouTube Data API antes de adicioná-lo à lista de reprodução para minimizar erros de reprodução durante a festa.

</details>
