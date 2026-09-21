/* =========================================================
   MI HISTORIA — script.js
   - Animaciones de aparición al hacer scroll.
   - Música de fondo (archivo de audio local, elemento <audio>
     nativo), controlada por el botón "Comenzar nuestra historia ❤️"
     y el control flotante.
   - Lightbox de la galería de fotos.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initMusicToggle();
  initMuteToggle();
  initStoryMusicStart();
  initLightbox();
});

/**
 * Preparación para futuras animaciones de aparición al hacer scroll.
 * Por ahora solo marca los elementos como visibles; en una parte
 * posterior se activará la transición (ver el CSS comentado en
 * la sección ".reveal" de style.css).
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || revealElements.length === 0) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * Reproductor de música de fondo (archivo de audio local, elemento
 * HTML5 <audio> nativo — ya no depende de YouTube).
 *
 * - Nunca se autorreproduce al cargar la página.
 * - Empieza a sonar cuando el usuario pulsa "Comenzar nuestra
 *   historia ❤️" (ver initStoryMusicStart) o el control flotante:
 *   ambos pasan por requestMusicPlay(), que siempre usa el mismo
 *   elemento "backgroundMusic" (nunca se crea otro).
 * - Sigue sonando mientras se recorre la página: es la misma
 *   página (anclas internas), nunca se recarga, así que nunca
 *   se reinicia por sí sola.
 */
const AUDIO_INITIAL_VOLUME = 0.35; // 30–40% pedido: volumen moderado al iniciar (escala 0–1 del <audio>)

function getBackgroundMusic() {
  return document.getElementById('backgroundMusic');
}

/**
 * Único punto de entrada para "quiero que suene la música".
 * Lo usan tanto el botón "Comenzar nuestra historia ❤️" como el
 * control flotante de reproducir. Nunca crea un elemento <audio>
 * nuevo ni vuelve a cargar el archivo: siempre reutiliza el mismo
 * "backgroundMusic".
 */
function requestMusicPlay() {
  const audio = getBackgroundMusic();
  if (!audio) return;

  audio.volume = AUDIO_INITIAL_VOLUME;

  const playPromise = audio.play();

  // En algunos navegadores play() devuelve una promesa que se
  // rechaza si el intento de reproducción fue bloqueado (por
  // ejemplo, casos límite de las políticas de autoplay). En vez
  // de insistir de forma automática, mostramos una indicación
  // discreta para que el usuario mismo pulse reproducir.
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(onMusicAutoplayBlocked);
  }
}

function onMusicAutoplayBlocked() {
  const hint = document.getElementById('musicHint');
  if (hint) hint.hidden = false;
}

/**
 * Mantiene sincronizados el ícono y el estado accesible del botón
 * de reproducir/pausar con lo que realmente está haciendo el
 * elemento <audio>.
 */
function updateMusicToggleUI(isPlaying) {
  const toggleButton = document.getElementById('musicToggle');
  const hint = document.getElementById('musicHint');

  if (isPlaying && hint) hint.hidden = true;
  if (!toggleButton) return;

  toggleButton.setAttribute('aria-pressed', String(isPlaying));
  toggleButton.setAttribute('aria-label', isPlaying ? 'Pausar música' : 'Reproducir música');

  const icon = toggleButton.querySelector('.music-icon');
  if (icon) icon.textContent = isPlaying ? '⏸' : '▶';
}

/**
 * Control flotante: reproducir / pausar. Siempre usa el mismo
 * elemento "backgroundMusic" — nunca pausa/reproduce un elemento
 * distinto ni vuelve a cargar el archivo.
 */
function initMusicToggle() {
  const toggleButton = document.getElementById('musicToggle');
  const audio = getBackgroundMusic();
  if (!toggleButton || !audio) return;

  toggleButton.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
    } else {
      requestMusicPlay();
    }
  });

  // El estado del botón siempre refleja el estado real del audio,
  // sin importar qué lo haya iniciado o pausado.
  audio.addEventListener('play', () => updateMusicToggleUI(true));
  audio.addEventListener('pause', () => updateMusicToggleUI(false));
}

/**
 * Control flotante: silenciar / activar sonido.
 */
function initMuteToggle() {
  const muteButton = document.getElementById('musicMuteToggle');
  const audio = getBackgroundMusic();
  if (!muteButton || !audio) return;

  muteButton.addEventListener('click', () => {
    const nowMuted = !audio.muted;
    audio.muted = nowMuted;

    const icon = muteButton.querySelector('.music-icon');
    muteButton.setAttribute('aria-pressed', String(nowMuted));
    muteButton.setAttribute('aria-label', nowMuted ? 'Activar sonido' : 'Silenciar música');
    if (icon) icon.textContent = nowMuted ? '🔇' : '🔊';
  });
}

/**
 * Vincula el inicio de la música al botón "Comenzar nuestra
 * historia ❤️" que ya existe en la portada. Es una acción real
 * del usuario, así que cumple con las políticas de autoplay de
 * los navegadores (incluido Android e iPhone). El enlace sigue
 * navegando con normalidad hacia #como-comenzo; esto solo añade
 * el inicio de la música al mismo clic.
 */
function initStoryMusicStart() {
  const startButton = document.getElementById('startStoryBtn');
  if (!startButton) return;

  startButton.addEventListener('click', requestMusicPlay);
}

/**
 * Lightbox de la sección "Momentos especiales".
 * Al pulsar una miniatura, muestra la fotografía completa
 * (sin recortar, con object-fit: contain en el CSS).
 * Se cierra con el botón, con ESC (teclado) o tocando fuera
 * de la imagen (celular/computadora). No genera scroll horizontal
 * porque el lightbox es "position: fixed" y cubre toda la pantalla.
 */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const closeButton = document.getElementById('lightboxClose');
  const galleryItems = document.querySelectorAll('.gallery__item');

  if (!lightbox || !lightboxImage || !closeButton || galleryItems.length === 0) {
    return;
  }

  function openLightbox(src, alt) {
    lightboxImage.src = src;
    lightboxImage.alt = alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // evita el scroll de fondo mientras está abierto
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const fullSrc = item.getAttribute('data-full');
      const img = item.querySelector('img');
      openLightbox(fullSrc, img ? img.alt : '');
    });
  });

  closeButton.addEventListener('click', closeLightbox);

  // Cerrar tocando/clicando el fondo oscuro (fuera de la imagen)
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  // Cerrar con la tecla ESC en computadora
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
}
