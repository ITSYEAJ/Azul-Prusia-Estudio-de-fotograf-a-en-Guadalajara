(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const punteroFino = window.matchMedia('(pointer: fine)');
  const dinero = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
  const mayuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1);
  const inicioDia = fecha => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const iso = fecha => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  const desdeIso = texto => {
    const [a, m, d] = texto.split('-').map(Number);
    return new Date(a, m - 1, d);
  };
  const fechaLarga = fecha => `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  const hash = texto => {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const azar = semilla => () => {
    semilla |= 0;
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const transicion = cambio => {
    if (document.startViewTransition && !movimientoReducido.matches) {
      const vista = document.startViewTransition(cambio);
      vista.ready.catch(() => {});
      return vista;
    }
    cambio();
    return null;
  };

  const raiz = document.documentElement;
  const barra = $('#barra');
  const menuBoton = $('#menuBoton');
  const menu = $('#menu');
  const altoCabecera = () => barra.offsetHeight;

  function medirCabecera() {
    raiz.style.setProperty('--alto-cabecera', `${barra.offsetHeight}px`);
  }

  function cerrarMenu() {
    menu.classList.remove('abierto');
    menuBoton.setAttribute('aria-expanded', 'false');
    menuBoton.setAttribute('aria-label', 'Abrir menú');
  }

  menuBoton.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    menuBoton.setAttribute('aria-expanded', String(abierto));
    menuBoton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });

  menu.addEventListener('click', evento => {
    if (evento.target.closest('a')) cerrarMenu();
  });

  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && menu.classList.contains('abierto')) {
      cerrarMenu();
      menuBoton.focus();
    }
  });

  const enlacesNav = $$('.nav__lista a[href^="#"]');
  const observadorNav = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      enlacesNav.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === `#${entrada.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  enlacesNav.forEach(a => {
    const seccion = document.querySelector(a.getAttribute('href'));
    if (seccion) observadorNav.observe(seccion);
  });

  const lienzo = $('#banner');
  const ctx = lienzo.getContext('2d');
  const SENSIBILIZADO = [201, 197, 126];
  const banner = { progreso: 0, w: 0, h: 0, px: 0, py: 0, objetivoX: 0, objetivoY: 0, cuadro: 0, listo: false };

  const hexARgb = hex => {
    const limpio = hex.replace('#', '').trim();
    const n = parseInt(limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  function paleta() {
    const estilos = getComputedStyle(document.body);
    return {
      c1: hexARgb(estilos.getPropertyValue('--color-1')),
      c2: estilos.getPropertyValue('--color-2').trim(),
      c3: estilos.getPropertyValue('--color-3').trim()
    };
  }

  const mezclar = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

  function medirBanner() {
    const anchoCss = lienzo.parentElement.clientWidth;
    const altoCss = anchoCss < 640
      ? Math.round(anchoCss * 0.98)
      : Math.round(limitar(Math.min(window.innerHeight * 0.66, anchoCss * 0.46), 400, 720));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(anchoCss * dpr);
    lienzo.height = Math.round(altoCss * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    banner.w = anchoCss;
    banner.h = altoCss;
  }

  function helecho(x0, y0, x1, y1, curva, grosor) {
    const cx = (x0 + x1) / 2 + (y1 - y0) * curva;
    const cy = (y0 + y1) / 2 - (x1 - x0) * curva;
    const largo = Math.hypot(x1 - x0, y1 - y0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.lineWidth = grosor;
    ctx.stroke();
    const pasos = 26;
    for (let i = 1; i < pasos; i++) {
      const t = i / pasos;
      const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
      const ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const angulo = Math.atan2(ty, tx);
      const hoja = largo * 0.2 * Math.pow(1 - t, 0.75) * (0.55 + 0.45 * Math.sin(Math.min(1, t * 3) * Math.PI / 2)) + 2;
      [-1, 1].forEach(lado => {
        const a = angulo + lado * (Math.PI / 2 - 0.45);
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * hoja / 2, py + Math.sin(a) * hoja / 2, hoja / 2, Math.max(1.4, hoja * 0.16), a, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function rama(x0, y0, x1, y1, curva, radio, cantidad) {
    const cx = (x0 + x1) / 2 + (y1 - y0) * curva;
    const cy = (y0 + y1) / 2 - (x1 - x0) * curva;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.lineWidth = Math.max(1.5, radio * 0.14);
    ctx.stroke();
    for (let i = 1; i <= cantidad; i++) {
      const t = i / (cantidad + 0.6);
      const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
      const ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const angulo = Math.atan2(ty, tx);
      const r = radio * (0.6 + 0.4 * (1 - t));
      [-1, 1].forEach(lado => {
        const a = angulo + lado * Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * r * 1.05, py + Math.sin(a) * r * 1.05, r, r * 0.82, a, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function semillas(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function vilano(x, y, escala, giro) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14 * escala);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(i * 2.6 * escala, -7 * escala);
      ctx.stroke();
    }
    ctx.restore();
  }

  function dibujarBanner() {
    const { w, h } = banner;
    if (!w) return;
    const { c1, c2, c3 } = paleta();
    const p = banner.progreso;
    const angosto = w < 640;
    const aleatorio = azar(20261029);
    const u = h / 420;
    const x0 = angosto ? 20 : Math.max(24, (w - 1240) / 2);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = rgb(mezclar(SENSIBILIZADO, c1, p));
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 10; i++) {
      const y = aleatorio() * h;
      const alto = 40 + aleatorio() * 90;
      const tono = aleatorio() > 0.5 ? '255, 255, 255' : '0, 10, 40';
      const trazo = ctx.createLinearGradient(0, y, 0, y + alto);
      trazo.addColorStop(0, `rgba(${tono}, 0)`);
      trazo.addColorStop(0.5, `rgba(${tono}, ${0.02 + aleatorio() * 0.025})`);
      trazo.addColorStop(1, `rgba(${tono}, 0)`);
      ctx.fillStyle = trazo;
      ctx.fillRect(0, y, w, alto);
    }

    if (p < 1) {
      const luzX = -0.2 * w + p * 1.4 * w;
      const luz = ctx.createRadialGradient(luzX, h * 0.3, 0, luzX, h * 0.3, w * 0.55);
      luz.addColorStop(0, `rgba(255, 248, 225, ${0.3 * (1 - p)})`);
      luz.addColorStop(1, 'rgba(255, 248, 225, 0)');
      ctx.fillStyle = luz;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    ctx.translate(banner.px * 9, banner.py * 6);
    ctx.fillStyle = c2;
    ctx.strokeStyle = c2;
    ctx.shadowColor = c2;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.95;

    if (angosto) {
      helecho(w * 1.04, h * 1.03, w * 0.82, h * 0.6, -0.12, 2);
      rama(w * 1.05, -h * 0.04, w * 0.8, h * 0.22, 0.1, 9, 4);
      semillas(w * 0.62, h * 1.04, 34);
    } else {
      helecho(w * 0.93, h * 1.06, w * 0.75, h * 0.04, 0.13, 2.4 * u);
      helecho(w * 1.01, h * 0.72, w * 0.86, h * 0.12, -0.1, 1.8 * u);
      rama(w * 1.01, -h * 0.05, w * 0.63, h * 0.46, -0.08, 15 * u, 9);
      rama(w * 0.7, h * 1.05, w * 0.62, h * 0.64, 0.15, 10 * u, 4);
      semillas(w * 0.54, h * 1.03, 56 * u);
    }

    ctx.globalAlpha = 0.8;
    ctx.shadowBlur = 2;
    const vilanos = angosto ? 5 : 11;
    for (let i = 0; i < vilanos; i++) {
      const x = angosto ? w * (0.08 + aleatorio() * 0.55) : x0 + aleatorio() * (w * 0.55 - x0);
      vilano(x, h * (0.07 + aleatorio() * (angosto ? 0.12 : 0.17)), (angosto ? 0.9 : 1.25 * u) * (0.7 + aleatorio() * 0.6), (aleatorio() - 0.5) * 1.2);
    }
    ctx.restore();

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--fondo').trim() || c2;
    for (let x = 0; x < w; x += 3) {
      ctx.fillRect(x, h - 2 - aleatorio() * 7, 3, 12);
    }

    const tamTitulo = angosto ? Math.min(w * 0.17, 80) : limitar(w * 0.088, 64, 138);
    const tamFrase = angosto ? Math.max(14, w * 0.043) : limitar(w * 0.017, 16, 25);
    const base = angosto ? h * 0.46 : h * 0.56;

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = c2;
    ctx.font = `800 ${tamTitulo}px "Archivo", "Arial Narrow", sans-serif`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-tamTitulo * 0.018}px`;
    ctx.globalAlpha = 0.35 + 0.65 * p;
    ctx.fillText('Azul Prusia', x0 - tamTitulo * 0.04, base);

    ctx.font = `600 ${tamFrase}px "Archivo", sans-serif`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'normal';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = c3;
    ctx.globalAlpha = Math.max(0, (p - 0.35) / 0.65);
    if (angosto) {
      ['Retrato, bodas y producto', 'con luz natural en Guadalajara'].forEach((linea, i) => ctx.fillText(linea, x0, base + tamFrase * (1.9 + i * 1.35)));
    } else {
      ctx.fillText('Retrato, bodas y producto con luz natural en Guadalajara', x0, base + tamFrase * 2.1);
    }

    const minutos = Math.round(p * 12 * 60);
    const reloj = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = c2;
    ctx.font = `600 ${angosto ? 12 : 14}px "Archivo", sans-serif`;
    ctx.fillText(p < 1 ? `Exponiendo al sol ${reloj}` : 'Cianotipia: 12 minutos de exposición al sol', x0, h - (angosto ? 22 : 30));
    ctx.globalAlpha = 1;
  }

  function revelarBanner() {
    if (movimientoReducido.matches) {
      banner.progreso = 1;
      banner.listo = true;
      dibujarBanner();
      return;
    }
    const inicio = performance.now();
    const duracion = 3000;
    const paso = ahora => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      banner.progreso = 1 - Math.pow(1 - t, 3);
      dibujarBanner();
      if (t < 1) requestAnimationFrame(paso);
      else banner.listo = true;
    };
    requestAnimationFrame(paso);
  }

  function animarParalaje() {
    banner.px += (banner.objetivoX - banner.px) * 0.12;
    banner.py += (banner.objetivoY - banner.py) * 0.12;
    dibujarBanner();
    if (Math.abs(banner.objetivoX - banner.px) > 0.002 || Math.abs(banner.objetivoY - banner.py) > 0.002) {
      banner.cuadro = requestAnimationFrame(animarParalaje);
    } else {
      banner.cuadro = 0;
    }
  }

  lienzo.addEventListener('pointermove', evento => {
    if (!banner.listo || movimientoReducido.matches || evento.pointerType !== 'mouse') return;
    const caja = lienzo.getBoundingClientRect();
    banner.objetivoX = ((evento.clientX - caja.left) / caja.width - 0.5) * 2;
    banner.objetivoY = ((evento.clientY - caja.top) / caja.height - 0.5) * 2;
    if (!banner.cuadro) banner.cuadro = requestAnimationFrame(animarParalaje);
  });

  lienzo.addEventListener('pointerleave', () => {
    banner.objetivoX = 0;
    banner.objetivoY = 0;
    if (banner.listo && !banner.cuadro) banner.cuadro = requestAnimationFrame(animarParalaje);
  });

  const HORARIOS = ['10:00', '12:00', '16:00', '17:30'];
  const CLAVE_LOCAL = 'azulprusia-solicitudes';

  function leerApartados() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || [];
    } catch {
      return [];
    }
  }

  function guardarApartado(fecha, horario) {
    try {
      const lista = leerApartados();
      lista.push({ fecha, horario });
      localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista.slice(-20)));
    } catch {
    }
  }

  const apartadoLocal = (fecha, horario) => leerApartados().some(a => a.fecha === fecha && a.horario === horario);

  function estadoDia(fecha, tipo) {
    const hoy = inicioDia(new Date());
    if (fecha <= hoy) return { estado: 'pasado', libres: [], todos: [] };
    const semana = fecha.getDay();
    const esBoda = tipo.startsWith('boda');
    if (semana === 1 || (semana === 0 && !esBoda)) return { estado: 'cerrado', libres: [], todos: [] };
    const clave = iso(fecha);
    const distancia = Math.round((fecha - hoy) / 86400000);
    const cercania = 1 - Math.min(distancia, 75) / 110;
    if (esBoda) {
      const probabilidad = (semana === 6 ? 0.7 : semana === 5 || semana === 0 ? 0.45 : 0.2) * cercania;
      const ocupado = (hash(`${clave}boda`) % 1000) / 1000 < probabilidad || apartadoLocal(clave, 'Todo el día');
      return { estado: ocupado ? 'lleno' : 'libre', libres: ocupado ? [] : ['Todo el día'], todos: ['Todo el día'] };
    }
    const probabilidad = (semana === 6 ? 0.62 : 0.32) * cercania;
    const libres = HORARIOS.filter(hora => (hash(clave + hora) % 1000) / 1000 >= probabilidad && !apartadoLocal(clave, hora));
    const estado = libres.length === 0 ? 'lleno' : libres.length <= 2 ? 'pocos' : 'libre';
    return { estado, libres, todos: HORARIOS };
  }

  function proximaLibre(tipo) {
    const d = inicioDia(new Date());
    for (let i = 1; i < 120; i++) {
      d.setDate(d.getDate() + 1);
      const info = estadoDia(d, tipo);
      if (info.libres.length && d.getDay() === 6) return { fecha: new Date(d), info };
    }
    return null;
  }

  function pintarProximaFecha() {
    const siguiente = proximaLibre('retrato');
    if (!siguiente) return;
    $('#proximaFecha').textContent = mayuscula(fechaLarga(siguiente.fecha));
    const n = siguiente.info.libres.length;
    $('#proximaNota').textContent = `Es el próximo sábado con lugar: ${n === 1 ? 'queda un horario' : `quedan ${n} horarios`}, el primero a las ${siguiente.info.libres[0]}.`;
  }

  pintarProximaFecha();

  const muro = $('#muro');
  const fijo = $('#muroFijo');
  const pista = $('#pista');
  const piezas = $$('.foto-pieza', pista);
  const barraMuro = $('#muroBarra');
  const conteoMuro = $('#muroConteo');
  const consultaFijo = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  const muroEstado = { fijo: false, distancia: 0, cuadro: 0 };
  const visibles = () => piezas.filter(p => !p.hidden);

  piezas.forEach(p => {
    p.revelado = movimientoReducido.matches ? 1 : 0;
    p.style.setProperty('--sin', String(1 - p.revelado));
  });

  function configurarMuro() {
    muroEstado.fijo = consultaFijo.matches;
    muro.classList.toggle('muro--libre', !muroEstado.fijo);
    pista.style.transform = '';
    if (muroEstado.fijo) {
      muroEstado.distancia = Math.max(0, pista.scrollWidth - fijo.clientWidth);
      muro.style.height = `${fijo.offsetHeight + muroEstado.distancia}px`;
    } else {
      muroEstado.distancia = 0;
      muro.style.height = '';
    }
    actualizarMuro();
  }

  function inicioMuro() {
    return muro.getBoundingClientRect().top + window.scrollY - altoCabecera();
  }

  function progresoMuro() {
    if (!muroEstado.fijo) {
      const maximo = pista.scrollWidth - pista.clientWidth;
      return maximo > 0 ? pista.scrollLeft / maximo : 0;
    }
    const recorrido = muro.offsetHeight - fijo.offsetHeight;
    return recorrido > 0 ? limitar((window.scrollY - inicioMuro()) / recorrido, 0, 1) : 0;
  }

  function actualizarMuro() {
    const avance = progresoMuro();
    if (muroEstado.fijo) pista.style.transform = `translate3d(${(-avance * muroEstado.distancia).toFixed(1)}px, 0, 0)`;
    barraMuro.style.setProperty('--avance', avance.toFixed(4));

    const caja = muroEstado.fijo ? { left: 0, width: window.innerWidth } : pista.getBoundingClientRect();
    const cajaMuro = muro.getBoundingClientRect();
    const enPantalla = cajaMuro.top < window.innerHeight * 0.85 && cajaMuro.bottom > 0;
    const centro = caja.left + caja.width / 2;
    let cercana = 0;
    let menor = Infinity;
    visibles().forEach((pieza, i) => {
      const r = pieza.getBoundingClientRect();
      const distanciaCentro = Math.abs(r.left + r.width / 2 - centro);
      if (distanciaCentro < menor) {
        menor = distanciaCentro;
        cercana = i;
      }
      if (enPantalla && pieza.revelado < 1) {
        const entrada = (r.left - (caja.left + caja.width * 0.5)) / (caja.width * 0.42);
        pieza.revelado = Math.max(pieza.revelado, 1 - limitar(entrada, 0, 1));
        pieza.style.setProperty('--sin', (1 - pieza.revelado).toFixed(3));
      }
    });
    conteoMuro.textContent = `${cercana + 1} / ${visibles().length}`;
    moverEnfoque();
  }

  function pedirMuro() {
    if (muroEstado.cuadro) return;
    muroEstado.cuadro = requestAnimationFrame(() => {
      muroEstado.cuadro = 0;
      actualizarMuro();
    });
  }

  function centrarPieza(pieza, comportamiento = 'smooth') {
    if (!muroEstado.fijo) {
      pieza.scrollIntoView({ inline: 'center', block: 'nearest', behavior: movimientoReducido.matches ? 'auto' : comportamiento });
      return;
    }
    const objetivo = limitar(pieza.offsetLeft + pieza.offsetWidth / 2 - fijo.clientWidth / 2, 0, muroEstado.distancia);
    window.scrollTo({ top: inicioMuro() + objetivo, behavior: comportamiento });
  }

  window.addEventListener('scroll', () => {
    barra.classList.toggle('con-sombra', window.scrollY > 8);
    pedirMuro();
  }, { passive: true });
  pista.addEventListener('scroll', pedirMuro, { passive: true });
  consultaFijo.addEventListener('change', configurarMuro);

  pista.addEventListener('focusin', evento => {
    const pieza = evento.target.closest('.foto-pieza');
    if (pieza && muroEstado.fijo) centrarPieza(pieza, 'auto');
  });

  const filtros = $$('.filtro');
  const galeriaEstado = $('#galeriaEstado');
  const NOMBRES_FILTRO = { todo: 'todas las fotos', retrato: 'retrato', bodas: 'bodas', producto: 'producto', familia: 'familia' };

  filtros.forEach(boton => {
    boton.addEventListener('click', () => {
      const filtro = boton.dataset.filtro;
      filtros.forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
      piezas.forEach((p, i) => { p.style.viewTransitionName = `pieza-${i}`; });
      const cambio = transicion(() => {
        piezas.forEach(p => { p.hidden = !(filtro === 'todo' || p.dataset.categoria === filtro); });
        configurarMuro();
        const cajaMuro = muro.getBoundingClientRect();
        if (muroEstado.fijo && cajaMuro.top < altoCabecera()) {
          window.scrollTo({ top: inicioMuro(), behavior: 'instant' });
        } else if (!muroEstado.fijo) {
          pista.scrollLeft = 0;
        }
        actualizarMuro();
      });
      const limpiar = () => piezas.forEach(p => { p.style.viewTransitionName = ''; });
      if (cambio) cambio.finished.finally(limpiar);
      else limpiar();
      const n = visibles().length;
      galeriaEstado.textContent = `Mostrando ${n} ${n === 1 ? 'foto' : 'fotos'} de ${NOMBRES_FILTRO[filtro]}.`;
    });
  });

  const enfoque = $('#enfoque');
  const enfoqueEstado = { raton: null };

  function moverEnfoque() {
    if (!enfoqueEstado.raton) return;
    const { x, y } = enfoqueEstado.raton;
    const debajo = document.elementFromPoint(x, y);
    const pieza = debajo && debajo.closest('.foto-pieza');
    let x1 = x - 38;
    let y1 = y - 28;
    let x2 = x + 38;
    let y2 = y + 28;
    if (pieza) {
      const r = $('img', pieza).getBoundingClientRect();
      x1 = r.left - 10;
      y1 = r.top - 10;
      x2 = r.right + 10;
      y2 = r.bottom + 10;
    }
    const valores = { '--x1': x1, '--y1': y1, '--x2': x2, '--y2': y2, '--cx': (x1 + x2) / 2, '--cy': (y1 + y2) / 2 };
    Object.entries(valores).forEach(([clave, valor]) => enfoque.style.setProperty(clave, `${valor.toFixed(1)}px`));
    enfoque.style.setProperty('--punto', pieza ? '1' : '0');
    enfoque.classList.toggle('fijado', Boolean(pieza));
  }

  muro.addEventListener('pointermove', evento => {
    if (evento.pointerType !== 'mouse' || !punteroFino.matches || movimientoReducido.matches) return;
    enfoqueEstado.raton = { x: evento.clientX, y: evento.clientY };
    enfoque.classList.add('visible');
    moverEnfoque();
  });

  muro.addEventListener('pointerleave', () => {
    enfoque.classList.remove('visible');
    enfoqueEstado.raton = null;
  });

  const destello = $('#destello');
  function disparar() {
    if (movimientoReducido.matches) return;
    destello.classList.remove('activo');
    void destello.offsetWidth;
    destello.classList.add('activo');
  }

  const visor = $('#visor');
  const visorImg = $('#visorImg');
  const tiraVisor = $('#visorTira');
  const visorEstado = { lista: [], indice: 0, toqueX: null };

  function construirMiniaturas() {
    tiraVisor.replaceChildren(...visorEstado.lista.map((pieza, i) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'visor__miniatura';
      boton.setAttribute('aria-label', `Ver ${$('figcaption strong', pieza).textContent}`);
      const img = document.createElement('img');
      img.src = $('img', pieza).getAttribute('src');
      img.alt = '';
      boton.append(img);
      boton.addEventListener('click', () => mostrarEnVisor(i, i > visorEstado.indice ? 1 : -1));
      return boton;
    }));
  }

  function llenarVisor(indice) {
    visorEstado.indice = (indice + visorEstado.lista.length) % visorEstado.lista.length;
    const pieza = visorEstado.lista[visorEstado.indice];
    const img = $('img', pieza);
    visorImg.src = img.getAttribute('src');
    visorImg.alt = img.alt;
    $('#visorTitulo').textContent = $('figcaption strong', pieza).textContent;
    $('#visorLugar').textContent = $('figcaption span', pieza).textContent;
    $('#visorConteo').textContent = `${visorEstado.indice + 1} de ${visorEstado.lista.length}`;
    $('#exifLente').textContent = pieza.dataset.lente;
    $('#exifApertura').textContent = pieza.dataset.apertura;
    $('#exifVelocidad').textContent = pieza.dataset.velocidad;
    $('#exifIso').textContent = pieza.dataset.iso;
    $$('.visor__miniatura', tiraVisor).forEach((b, i) => b.setAttribute('aria-current', String(i === visorEstado.indice)));
  }

  function mostrarEnVisor(indice, direccion = 1) {
    llenarVisor(indice);
    if (!movimientoReducido.matches && visorImg.animate) {
      visorImg.animate([
        { opacity: 0, transform: `translateX(${direccion * 40}px) scale(0.98)` },
        { opacity: 1, transform: 'none' }
      ], { duration: 550, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    }
  }

  function abrirVisor(pieza) {
    visorEstado.lista = visibles();
    construirMiniaturas();
    const indice = visorEstado.lista.indexOf(pieza);
    const img = $('img', pieza);
    enfoque.classList.remove('visible');
    disparar();
    if (!document.startViewTransition || movimientoReducido.matches) {
      llenarVisor(indice);
      visor.showModal();
      return;
    }
    img.style.viewTransitionName = 'foto-activa';
    const cambio = document.startViewTransition(() => {
      img.style.viewTransitionName = '';
      llenarVisor(indice);
      visorImg.style.viewTransitionName = 'foto-activa';
      visor.showModal();
    });
    cambio.ready.catch(() => {});
    cambio.finished.finally(() => { visorImg.style.viewTransitionName = ''; });
  }

  function cerrarVisor() {
    const pieza = visorEstado.lista[visorEstado.indice];
    if (!pieza || !document.startViewTransition || movimientoReducido.matches) {
      visor.close();
      return;
    }
    centrarPieza(pieza, 'instant');
    actualizarMuro();
    const img = $('img', pieza);
    visorImg.style.viewTransitionName = 'foto-activa';
    const cambio = document.startViewTransition(() => {
      visorImg.style.viewTransitionName = '';
      visor.close();
      img.style.viewTransitionName = 'foto-activa';
    });
    cambio.ready.catch(() => {});
    cambio.finished.finally(() => {
      img.style.viewTransitionName = '';
      $('.foto-pieza__boton', pieza).focus({ preventScroll: true });
    });
  }

  piezas.forEach(pieza => {
    const boton = $('.foto-pieza__boton', pieza);
    boton.setAttribute('aria-label', `Ampliar: ${$('figcaption strong', pieza).textContent}`);
    boton.addEventListener('click', () => abrirVisor(pieza));
  });

  $('#visorCerrar').addEventListener('click', cerrarVisor);
  $('#visorPrev').addEventListener('click', () => mostrarEnVisor(visorEstado.indice - 1, -1));
  $('#visorSig').addEventListener('click', () => mostrarEnVisor(visorEstado.indice + 1, 1));
  visor.addEventListener('cancel', evento => {
    evento.preventDefault();
    cerrarVisor();
  });
  visor.addEventListener('keydown', evento => {
    if (evento.key === 'ArrowLeft') mostrarEnVisor(visorEstado.indice - 1, -1);
    if (evento.key === 'ArrowRight') mostrarEnVisor(visorEstado.indice + 1, 1);
  });
  $('.visor__escena').addEventListener('pointerdown', evento => {
    if (evento.pointerType !== 'mouse') visorEstado.toqueX = evento.clientX;
  });
  $('.visor__escena').addEventListener('pointerup', evento => {
    if (visorEstado.toqueX === null) return;
    const diferencia = evento.clientX - visorEstado.toqueX;
    if (Math.abs(diferencia) > 50) mostrarEnVisor(visorEstado.indice + (diferencia < 0 ? 1 : -1), diferencia < 0 ? 1 : -1);
    visorEstado.toqueX = null;
  });

  const comparador = $('#comparador');
  const rango = $('#comparadorRango');
  const histograma = $('#histograma');
  const BARRAS = 32;
  const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  const crudo = [];
  const editado = [];
  for (let i = 0; i < BARRAS; i++) {
    const x = (i + 0.5) / BARRAS;
    crudo.push(gauss(x, 0.56, 0.11) + 0.12 * gauss(x, 0.4, 0.2));
    editado.push(0.55 * gauss(x, 0.22, 0.1) + 0.45 * gauss(x, 0.48, 0.14) + 0.9 * gauss(x, 0.76, 0.1) + 0.06);
  }
  const maxCrudo = Math.max(...crudo);
  const maxEditado = Math.max(...editado);
  const NS = 'http://www.w3.org/2000/svg';
  const rectangulos = [];
  const anchoBarra = 240 / BARRAS;
  for (let i = 0; i < BARRAS; i++) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', (i * anchoBarra + 0.6).toFixed(2));
    r.setAttribute('width', (anchoBarra - 1.4).toFixed(2));
    histograma.append(r);
    rectangulos.push(r);
  }

  function actualizarCorte() {
    comparador.style.setProperty('--corte', `${rango.value}%`);
    const parteCruda = Number(rango.value) / 100;
    rectangulos.forEach((r, i) => {
      const valor = (crudo[i] / maxCrudo) * parteCruda + (editado[i] / maxEditado) * (1 - parteCruda);
      const alto = Math.max(1, valor * 66);
      r.setAttribute('y', (70 - alto).toFixed(2));
      r.setAttribute('height', alto.toFixed(2));
    });
  }

  rango.addEventListener('input', actualizarCorte);
  actualizarCorte();

  function pintarOdometro(elemento, texto) {
    let accesible = $('.visually-hidden', elemento);
    let visual = $('.odometro__visual', elemento);
    if (!accesible || !visual) {
      elemento.textContent = '';
      accesible = document.createElement('span');
      accesible.className = 'visually-hidden';
      visual = document.createElement('span');
      visual.className = 'odometro__visual';
      visual.setAttribute('aria-hidden', 'true');
      visual.style.display = 'inline-flex';
      elemento.append(accesible, visual);
    }
    accesible.textContent = texto;
    const caracteres = texto.split('');
    const reconstruir = visual.childElementCount !== caracteres.length ||
      caracteres.some((c, i) => /\d/.test(c) !== visual.children[i].classList.contains('odometro__digito'));
    if (reconstruir) {
      visual.replaceChildren(...caracteres.map(c => {
        if (!/\d/.test(c)) {
          const s = document.createElement('span');
          s.textContent = c;
          return s;
        }
        const digito = document.createElement('span');
        digito.className = 'odometro__digito';
        const columna = document.createElement('span');
        columna.className = 'odometro__columna';
        columna.style.setProperty('--d', '0');
        for (let n = 0; n <= 9; n++) {
          const s = document.createElement('span');
          s.textContent = n;
          columna.append(s);
        }
        digito.append(columna);
        return digito;
      }));
      void visual.offsetWidth;
    }
    caracteres.forEach((c, i) => {
      if (/\d/.test(c)) $('.odometro__columna', visual.children[i]).style.setProperty('--d', c);
    });
  }

  const TIPOS = {
    retrato: { nombre: 'Retrato', base: 65000, hora: 19000, dias: 10, horas: 1, extras: ['album', 'expres', 'maquillaje', 'traslado'] },
    familia: { nombre: 'Familia', base: 80000, hora: 22000, dias: 10, horas: 1.5, extras: ['album', 'expres', 'maquillaje', 'traslado'] },
    producto: { nombre: 'Producto', base: 105000, hora: 24000, dias: 5, horas: 3, extras: ['expres', 'traslado'] },
    'boda-civil': { nombre: 'Boda civil', base: 255000, hora: 40000, dias: 20, horas: 4, extras: ['segundo', 'album', 'expres', 'maquillaje', 'traslado'] },
    'boda-completa': { nombre: 'Boda completa', base: 650000, hora: 48000, dias: 30, horas: 10, extras: ['segundo', 'album', 'expres', 'maquillaje', 'traslado'] }
  };
  const EXTRAS = {
    segundo: { nombre: 'Segundo fotógrafo', precio: 68000 },
    album: { nombre: 'Álbum impreso', precio: 86000 },
    expres: { nombre: 'Entrega exprés', precio: 24000 },
    maquillaje: { nombre: 'Maquillaje y peinado', precio: 32000 },
    traslado: { nombre: 'Fuera de la zona metropolitana', precio: 22000 }
  };

  const formCotiza = $('#cotizador');
  const horasInput = $('#horasExtra');
  const fechaCotiza = $('#fechaCotiza');
  const totalCotiza = $('#totalCotiza');
  let ultimaCotizacion = null;

  const manana = inicioDia(new Date());
  manana.setDate(manana.getDate() + 1);
  fechaCotiza.min = iso(manana);

  function sumarHabiles(fecha, dias) {
    const d = new Date(fecha);
    let contados = 0;
    while (contados < dias) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) contados++;
    }
    return d;
  }

  function calcularCotizacion() {
    const tipoClave = formCotiza.elements.tipo.value;
    const tipo = TIPOS[tipoClave];
    const horas = limitar(parseInt(horasInput.value, 10) || 0, 0, 6);
    horasInput.value = horas;
    const duracion = tipo.horas === 1 ? '1 hora' : Number.isInteger(tipo.horas) ? `${tipo.horas} horas` : `${tipo.horas * 60} minutos`;
    $('#horasAyuda').textContent = `Cada hora adicional de ${tipo.nombre.toLowerCase()} cuesta ${dinero.format(tipo.hora)}. La sesión base dura ${duracion}.`;

    const lineas = [{ texto: `${tipo.nombre}, sesión base`, monto: tipo.base }];
    if (horas) lineas.push({ texto: `${horas} ${horas === 1 ? 'hora adicional' : 'horas adicionales'}`, monto: horas * tipo.hora });

    const elegidos = [];
    $$('input[name="extra"]', formCotiza).forEach(casilla => {
      const permitido = tipo.extras.includes(casilla.value);
      casilla.disabled = !permitido;
      if (!permitido) casilla.checked = false;
      casilla.closest('.opcion').classList.toggle('opcion--apagada', !permitido);
      if (casilla.checked) {
        elegidos.push(casilla.value);
        lineas.push({ texto: EXTRAS[casilla.value].nombre, monto: EXTRAS[casilla.value].precio });
      }
    });

    const diasExpres = tipoClave.startsWith('boda') ? 7 : 3;
    $('input[value="expres"]', formCotiza).closest('.opcion').querySelector('small').textContent = `Tu galería en ${diasExpres} días hábiles`;

    const total = lineas.reduce((suma, l) => suma + l.monto, 0);
    const anticipo = Math.round(total * 0.3);
    const lista = $('#desglose');
    const anteriores = Array.from(lista.children).map(li => li.dataset.clave);
    lista.replaceChildren(...lineas.map((l, i) => {
      const li = document.createElement('li');
      li.dataset.clave = l.texto;
      if (anteriores.includes(l.texto)) li.style.animation = 'none';
      else li.style.animationDelay = `${i * 40}ms`;
      const a = document.createElement('span');
      const b = document.createElement('span');
      a.textContent = l.texto;
      b.textContent = dinero.format(l.monto);
      li.append(a, b);
      return li;
    }));

    pintarOdometro(totalCotiza, dinero.format(total));
    $('#anticipoCotiza').textContent = dinero.format(anticipo);

    const dias = elegidos.includes('expres') ? diasExpres : tipo.dias;
    const entrega = $('#entregaCotiza');
    if (fechaCotiza.value) {
      const fecha = desdeIso(fechaCotiza.value);
      if (fecha < manana) {
        entrega.textContent = 'Elige una fecha a partir de mañana.';
      } else {
        const fechaEntrega = sumarHabiles(fecha, dias);
        const sinLugar = !estadoDia(fecha, tipoClave).libres.length;
        entrega.textContent = `Si la sesión es el ${fechaLarga(fecha)}, recibes tus fotos a más tardar el ${fechaLarga(fechaEntrega)} (${dias} días hábiles).${sinLugar ? ' Ojo: ese día ya no tenemos lugar para este tipo de sesión.' : ''}`;
      }
    } else {
      entrega.textContent = `Entregamos en ${dias} días hábiles. Elige una fecha para calcular el día exacto.`;
    }

    ultimaCotizacion = { tipo: tipoClave, lineas, total, anticipo, fecha: fechaCotiza.value };
  }

  formCotiza.addEventListener('input', calcularCotizacion);
  formCotiza.addEventListener('change', calcularCotizacion);
  formCotiza.addEventListener('submit', evento => evento.preventDefault());

  $$('.contador__boton', formCotiza).forEach(boton => {
    boton.addEventListener('click', () => {
      horasInput.value = limitar((parseInt(horasInput.value, 10) || 0) + Number(boton.dataset.paso), 0, 6);
      calcularCotizacion();
    });
  });

  $$('[data-cotizar]').forEach(boton => {
    boton.addEventListener('click', () => {
      const radio = $(`input[name="tipo"][value="${boton.dataset.cotizar}"]`, formCotiza);
      radio.checked = true;
      calcularCotizacion();
      $('#cotiza').scrollIntoView({ behavior: movimientoReducido.matches ? 'auto' : 'smooth' });
      setTimeout(() => radio.focus({ preventScroll: true }), 600);
    });
  });

  calcularCotizacion();

  const diasCal = $('#calendarioDias');
  const mesTitulo = $('#mesTitulo');
  const mesAnterior = $('#mesAnterior');
  const mesSiguiente = $('#mesSiguiente');
  const horariosCaja = $('#horarios');
  const resTipo = $('#resTipo');
  const hoy = inicioDia(new Date());
  const primerMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 1);
  const diasRestantes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - hoy.getDate();
  let mesVisible = diasRestantes < 7 ? new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1) : new Date(primerMes);
  let fechaElegida = null;
  let horarioElegido = null;
  let cotizacionAdjunta = null;

  function pintarCalendario() {
    const tipo = resTipo.value;
    mesTitulo.textContent = `${mayuscula(MESES[mesVisible.getMonth()])} ${mesVisible.getFullYear()}`;
    mesAnterior.disabled = mesVisible <= primerMes;
    mesSiguiente.disabled = mesVisible >= ultimoMes;

    const desfase = (mesVisible.getDay() + 6) % 7;
    const diasMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < desfase; i++) {
      const vacio = document.createElement('span');
      vacio.setAttribute('aria-hidden', 'true');
      celdas.push(vacio);
    }
    let primeroLibre = null;
    let elegidoBoton = null;
    const etiquetas = { libre: 'libre', pocos: 'pocos horarios', lleno: 'sin lugar', cerrado: 'estudio cerrado', pasado: 'no disponible' };
    for (let d = 1; d <= diasMes; d++) {
      const fecha = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), d);
      const info = estadoDia(fecha, tipo);
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'dia';
      boton.textContent = d;
      boton.dataset.fecha = iso(fecha);
      boton.tabIndex = -1;
      boton.setAttribute('aria-label', `${fechaLarga(fecha)}, ${etiquetas[info.estado]}`);
      if (info.estado === 'libre' || info.estado === 'pocos' || info.estado === 'lleno') boton.classList.add(`dia--${info.estado}`);
      if (!info.libres.length) boton.disabled = true;
      if (+fecha === +hoy) boton.classList.add('dia--hoy');
      const elegido = fechaElegida && boton.dataset.fecha === fechaElegida;
      boton.setAttribute('aria-selected', String(Boolean(elegido)));
      if (!boton.disabled && !primeroLibre) primeroLibre = boton;
      if (elegido) elegidoBoton = boton;
      celdas.push(boton);
    }
    const enfocable = elegidoBoton || primeroLibre;
    if (enfocable) enfocable.tabIndex = 0;
    diasCal.replaceChildren(...celdas);
  }

  function cambiarMes(delta) {
    mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1);
    diasCal.style.animation = 'none';
    void diasCal.offsetWidth;
    diasCal.style.animation = '';
    pintarCalendario();
  }

  function pintarHorarios() {
    horarioElegido = null;
    if (!fechaElegida) {
      const vacio = document.createElement('p');
      vacio.className = 'horarios__vacio';
      vacio.textContent = 'Primero elige un día en el calendario.';
      horariosCaja.replaceChildren(vacio);
      return;
    }
    const info = estadoDia(desdeIso(fechaElegida), resTipo.value);
    horariosCaja.replaceChildren(...info.todos.map((hora, i) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'horario';
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', 'false');
      boton.textContent = hora === '17:30' ? '17:30, hora dorada' : hora;
      boton.dataset.hora = hora;
      boton.style.animationDelay = `${i * 60}ms`;
      if (!info.libres.includes(hora)) {
        boton.disabled = true;
        boton.setAttribute('aria-label', `${hora}, ocupado`);
      }
      return boton;
    }));
  }

  diasCal.addEventListener('click', evento => {
    const boton = evento.target.closest('.dia');
    if (!boton || boton.disabled) return;
    fechaElegida = boton.dataset.fecha;
    pintarCalendario();
    $(`.dia[data-fecha="${fechaElegida}"]`, diasCal).focus();
    pintarHorarios();
    limpiarError('errorHorario');
  });

  diasCal.addEventListener('keydown', evento => {
    const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(evento.key in pasos)) return;
    evento.preventDefault();
    const dias = $$('.dia', diasCal);
    const actual = dias.indexOf(document.activeElement);
    if (actual < 0) return;
    let siguiente = actual + pasos[evento.key];
    while (dias[siguiente] && dias[siguiente].disabled) siguiente += Math.sign(pasos[evento.key]);
    if (!dias[siguiente]) return;
    dias.forEach(d => { d.tabIndex = -1; });
    dias[siguiente].tabIndex = 0;
    dias[siguiente].focus();
  });

  horariosCaja.addEventListener('click', evento => {
    const boton = evento.target.closest('.horario');
    if (!boton || boton.disabled) return;
    $$('.horario', horariosCaja).forEach(b => b.setAttribute('aria-checked', String(b === boton)));
    horarioElegido = boton.dataset.hora;
    limpiarError('errorHorario');
  });

  mesAnterior.addEventListener('click', () => cambiarMes(-1));
  mesSiguiente.addEventListener('click', () => cambiarMes(1));

  resTipo.addEventListener('change', () => {
    if (fechaElegida && !estadoDia(desdeIso(fechaElegida), resTipo.value).libres.length) fechaElegida = null;
    pintarCalendario();
    pintarHorarios();
  });

  function elegirFecha(texto) {
    const fecha = desdeIso(texto);
    if (!estadoDia(fecha, resTipo.value).libres.length) return false;
    fechaElegida = texto;
    mesVisible = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    if (mesVisible > ultimoMes) mesVisible = new Date(ultimoMes);
    pintarCalendario();
    pintarHorarios();
    return true;
  }

  $('#usarCotizacion').addEventListener('click', () => {
    if (!ultimaCotizacion) return;
    cotizacionAdjunta = ultimaCotizacion;
    resTipo.value = ultimaCotizacion.tipo;
    let aviso = '';
    if (ultimaCotizacion.fecha && elegirFecha(ultimaCotizacion.fecha)) {
      aviso = ' Ya marcamos tu fecha: elige el horario.';
    } else {
      if (ultimaCotizacion.fecha) aviso = ' Esa fecha ya no tiene lugar para este tipo de sesión; elige otra en el calendario.';
      fechaElegida = null;
      pintarCalendario();
      pintarHorarios();
    }
    const caja = $('#reservaCotizacion');
    const extras = ultimaCotizacion.lineas.slice(1).map(l => l.texto.toLowerCase()).join(', ');
    caja.textContent = `Cotización adjunta: ${TIPOS[ultimaCotizacion.tipo].nombre}${extras ? ` con ${extras}` : ''}. Total ${dinero.format(ultimaCotizacion.total)}, anticipo ${dinero.format(ultimaCotizacion.anticipo)}.${aviso}`;
    caja.hidden = false;
    $('#cotizaEstado').textContent = 'Cotización agregada a tu solicitud.';
    $('#reserva').scrollIntoView({ behavior: movimientoReducido.matches ? 'auto' : 'smooth' });
  });

  pintarCalendario();

  const formReserva = $('#formReserva');
  const campos = {
    nombre: { input: $('#resNombre'), error: 'errorNombre', validar: v => v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.' },
    correo: { input: $('#resCorreo'), error: 'errorCorreo', validar: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa el correo: debe verse como nombre@correo.com.' },
    telefono: { input: $('#resTelefono'), error: 'errorTelefono', validar: v => v.replace(/\D/g, '').length >= 10 ? '' : 'El WhatsApp debe tener 10 dígitos.' }
  };

  function mostrarError(id, mensaje, input) {
    const p = document.getElementById(id);
    p.textContent = mensaje;
    const campo = p.closest('.campo');
    if (campo) campo.classList.toggle('campo--error', Boolean(mensaje));
    if (input) {
      input.setAttribute('aria-invalid', String(Boolean(mensaje)));
      if (mensaje) input.setAttribute('aria-describedby', id);
      else input.removeAttribute('aria-describedby');
    }
  }

  function limpiarError(id) {
    mostrarError(id, '');
  }

  Object.values(campos).forEach(campo => {
    campo.input.addEventListener('blur', () => {
      if (campo.input.value) mostrarError(campo.error, campo.validar(campo.input.value), campo.input);
    });
    campo.input.addEventListener('input', () => {
      if (campo.input.getAttribute('aria-invalid') === 'true') mostrarError(campo.error, campo.validar(campo.input.value), campo.input);
    });
  });

  let ultimaSolicitud = null;

  formReserva.addEventListener('submit', evento => {
    evento.preventDefault();
    let primero = null;
    if (!fechaElegida || !horarioElegido) {
      mostrarError('errorHorario', fechaElegida ? 'Elige un horario.' : 'Elige un día en el calendario y luego un horario.');
      primero = fechaElegida ? horariosCaja : diasCal;
    }
    Object.values(campos).forEach(campo => {
      const mensaje = campo.validar(campo.input.value);
      mostrarError(campo.error, mensaje, campo.input);
      if (mensaje && !primero) primero = campo.input;
    });
    if (primero) {
      const objetivo = primero.querySelector ? (primero.querySelector('button:not(:disabled)') || primero) : primero;
      objetivo.focus();
      return;
    }
    if (formReserva.elements.sitio.value) return;

    const datos = {
      fecha: fechaElegida,
      horario: horarioElegido,
      tipo: resTipo.value,
      nombre: campos.nombre.input.value.trim(),
      correo: campos.correo.input.value.trim(),
      telefono: campos.telefono.input.value.trim(),
      mensaje: $('#resMensaje').value.trim(),
      cotizacion: cotizacionAdjunta && cotizacionAdjunta.tipo === resTipo.value ? cotizacionAdjunta : null
    };
    ultimaSolicitud = datos;
    guardarApartado(datos.fecha, datos.horario);
    mostrarConfirmacion(datos);
  });

  function mostrarConfirmacion(datos) {
    const fecha = desdeIso(datos.fecha);
    const tipo = TIPOS[datos.tipo];
    $('#confirmacionTexto').textContent = `${datos.nombre.split(' ')[0]}, apartamos provisionalmente el ${fechaLarga(fecha)} para ti. Envía la solicitud por correo y te confirmamos en menos de 24 horas.`;
    const filas = [
      ['Fecha', mayuscula(fechaLarga(fecha))],
      ['Horario', datos.horario],
      ['Sesión', tipo.nombre],
      ['Nombre', datos.nombre],
      ['Correo', datos.correo],
      ['WhatsApp', datos.telefono]
    ];
    if (datos.cotizacion) filas.push(['Cotización', `${dinero.format(datos.cotizacion.total)} (anticipo ${dinero.format(datos.cotizacion.anticipo)})`]);
    if (datos.mensaje) filas.push(['Notas', datos.mensaje]);
    const dl = $('#confirmacionDatos');
    dl.replaceChildren();
    filas.forEach(([clave, valor]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = clave;
      dd.textContent = valor;
      dl.append(dt, dd);
    });
    const cuerpo = filas.map(([c, v]) => `${c}: ${v}`).join('\n');
    $('#confirmacionCorreo').href = `mailto:hola@azulprusia.mx?subject=${encodeURIComponent(`Solicitud de sesión: ${fechaLarga(fecha)}`)}&body=${encodeURIComponent(`Hola, quiero apartar esta fecha:\n\n${cuerpo}`)}`;
    transicion(() => {
      $('.reserva').hidden = true;
      $('#confirmacion').hidden = false;
    });
    $('#confirmacion').focus();
    pintarCalendario();
  }

  $('#confirmacionIcs').addEventListener('click', () => {
    if (!ultimaSolicitud) return;
    const tipo = TIPOS[ultimaSolicitud.tipo];
    const [anio, mes, dia] = ultimaSolicitud.fecha.split('-');
    const hora = ultimaSolicitud.horario === 'Todo el día' ? '09:00' : ultimaSolicitud.horario;
    const [hh, mm] = hora.split(':').map(Number);
    const fin = new Date(Number(anio), Number(mes) - 1, Number(dia), hh, mm);
    fin.setMinutes(fin.getMinutes() + tipo.horas * 60);
    const formato = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
    const inicio = `${anio}${mes}${dia}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Azul Prusia//Reservas//ES',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@azulprusia.mx`,
      `DTSTAMP:${formato(new Date())}`,
      `DTSTART:${inicio}`,
      `DTEND:${formato(fin)}`,
      `SUMMARY:Sesión de ${tipo.nombre.toLowerCase()} con Azul Prusia`,
      'LOCATION:Calle Libertad 1820\\, Col. Americana\\, Guadalajara\\, Jal.',
      'DESCRIPTION:Solicitud pendiente de confirmar. Llega 10 minutos antes.',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    enlace.download = `azul-prusia-${ultimaSolicitud.fecha}.ics`;
    document.body.append(enlace);
    enlace.click();
    setTimeout(() => {
      URL.revokeObjectURL(enlace.href);
      enlace.remove();
    }, 500);
  });

  $('#confirmacionOtra').addEventListener('click', () => {
    formReserva.reset();
    fechaElegida = null;
    cotizacionAdjunta = null;
    $('#reservaCotizacion').hidden = true;
    transicion(() => {
      $('#confirmacion').hidden = true;
      $('.reserva').hidden = false;
    });
    pintarCalendario();
    pintarHorarios();
    pintarProximaFecha();
    $('#resNombre').focus();
  });

  function estadoEstudio() {
    const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const dato = tipo => partes.find(p => p.type === tipo).value;
    const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dato('weekday'));
    const minutos = (Number(dato('hour')) % 24) * 60 + Number(dato('minute'));
    const abierto = semana >= 2 && semana <= 6 && minutos >= 600 && minutos < 1140;
    const pie = $('#pieEstado');
    pie.classList.toggle('abierto', abierto);
    if (abierto) {
      pie.textContent = 'Abierto ahora';
    } else {
      const siguiente = semana === 0 || semana === 1 || (semana === 6 && minutos >= 1140) ? 'el martes' : minutos < 600 ? 'hoy' : 'mañana';
      pie.textContent = `Cerrado ahora, abrimos ${siguiente} a las 10:00`;
    }
  }

  estadoEstudio();
  setInterval(estadoEstudio, 60000);

  let esperaRedimension = 0;
  window.addEventListener('resize', () => {
    clearTimeout(esperaRedimension);
    esperaRedimension = setTimeout(() => {
      medirCabecera();
      medirBanner();
      dibujarBanner();
      configurarMuro();
    }, 140);
  });

  medirCabecera();
  medirBanner();
  dibujarBanner();
  configurarMuro();
  window.addEventListener('load', configurarMuro);
  const fuentesListas = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
  fuentesListas.then(() => {
    medirCabecera();
    configurarMuro();
    revelarBanner();
  });
})();
