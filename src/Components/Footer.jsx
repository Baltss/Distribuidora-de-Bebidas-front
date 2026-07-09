import Logotipo from '../../public/Logotipo.svg';

const Footer = () => {
  return (
    <footer className="relative w-full overflow-hidden bg-black text-white">
      {/* AURORAS EN SVG (visibles SIEMPRE) */}
      <AurorasPink />

      {/* ESTRELLAS */}
      <StarsPink />

      {/* CONTENIDO */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <div className="flex flex-wrap gap-y-12">
          {/* BRAND */}
          <div className="w-full sm:w-2/3 lg:w-4/12 px-2">
            <div className="space-y-6">
              {/* Placa blanca para asegurar contraste del logo */}

              <img src={Logotipo} alt="SoftFusion" />

              <p className="text-sm md:text-base text-white/80 max-w-md">
                ᴅᴏɴᴅᴇ ʟᴀ ᴛᴇᴄɴᴏʟᴏɢíᴀ, ʟᴀ ɪɴɴᴏᴠᴀᴄɪóɴ ʏ ʟᴀꜱ ᴘᴇʀꜱᴏɴᴀꜱ ꜱᴇ ᴜɴᴇɴ.
              </p>

              <a
                href="tel:+5493815430503"
                className="group inline-flex items-center gap-2 text-sm text-white/90 hover:text-white transition"
              >
                <PhoneIcon />
                <span className="tracking-wide">+54 9 3813 58-8908</span>
                <span className="h-px w-6 bg-gradient-to-r from-rose-400/0 via-rose-400/70 to-rose-400/0 translate-y-[7px] group-hover:via-rose-300/90 transition" />
              </a>
            </div>
          </div>

          {/* LINKS */}
          <LinkGroup header="Servicios">
            <NavLink
              link="https://softfusion.com.ar/"
              label="Desarrollo a Medida"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Gestión de Redes"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Software de Ventas"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Creación de Contenido"
              target="_blank"
              rel="noopener noreferrer"
            />
          </LinkGroup>

          <LinkGroup header="Empresa">
            <NavLink
              link="https://softfusion.com.ar/"
              label="Sobre SoftFusion"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Contacto y Soporte"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Casos de Éxito"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Políticas y Privacidad"
              target="_blank"
              rel="noopener noreferrer"
            />
          </LinkGroup>

          <LinkGroup header="Enlaces Rápidos">
            <NavLink
              link="https://softfusion.com.ar/"
              label="Experiencia"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Testimonios"
              target="_blank"
              rel="noopener noreferrer"
            />
            <NavLink
              link="https://softfusion.com.ar/"
              label="Conoce al Equipo"
              target="_blank"
              rel="noopener noreferrer"
            />
          </LinkGroup>

          {/* SOCIAL */}
          <div className="w-full sm:w-1/2 lg:w-3/12 px-2">
            <h4 className="mb-5 text-base font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-pink-300">
              Síguenos
            </h4>

            <div className="mb-6 flex items-center gap-3">
              <SocialLink
                href="https://www.facebook.com/share/1JAMUqUEaQ/?mibextid=wwXIfr"
                img="https://cdn-icons-png.flaticon.com/512/733/733547.png"
                alt="Facebook"
              />
              <SocialLink
                href="https://wa.me/5493815430503"
                img="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                alt="WhatsApp"
              />
              <SocialLink
                href="https://www.instagram.com/softfusiontechnologies"
                img="https://cdn-icons-png.flaticon.com/512/2111/2111463.png"
                alt="Instagram"
              />
              <SocialLink
                href="https://www.linkedin.com/in/soft-fusionsa/"
                img="https://cdn-icons-png.flaticon.com/512/145/145807.png"
                alt="LinkedIn"
              />
            </div>

            <p className="text-sm text-white/70">&copy; 2026 SoftFusion</p>
          </div>
        </div>
      </div>

      {/* LÍNEAS NEÓN ROSITA (arriba y abajo) */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-rose-400/0 via-rose-300/80 to-pink-300/0" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-pink-300/0 via-pink-300/80 to-rose-400/0" />

      {/* Estilos locales de animación */}
      <style>{`
        @keyframes twinkle { 
          0%, 100% { opacity:.35; transform:scale(1)}
          50% { opacity:1; transform:scale(1.12)}
        }
        .twinkle { animation: twinkle 3.8s ease-in-out infinite; }
      `}</style>
    </footer>
  );
};

export default Footer;

/* ——————————— Subcomponentes ——————————— */

const LinkGroup = ({ children, header }) => {
  return (
    <div className="w-full sm:w-1/2 lg:w-2/12 px-2">
      <h4 className="mb-5 text-base font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-pink-300">
        {header}
      </h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
};

const NavLink = ({ link, label }) => {
  return (
    <li>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-[15px] leading-loose text-white/75 hover:text-white transition hover:drop-shadow-[0_0_16px_rgba(244,114,182,.5)]"
      >
        {label}
      </a>
    </li>
  );
};

const SocialLink = ({ href, img, alt }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-10 w-10 items-center justify-center rounded-full
      ring-1 ring-white/15 hover:ring-white/60 transition backdrop-blur
      bg-white/5 hover:bg-white/10 overflow-hidden"
      aria-label={alt}
    >
      {/* glow rosita */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition
      bg-gradient-to-tr from-rose-400/40 via-pink-400/20 to-rose-300/35 blur"
      />
      <img src={img} alt={alt} width={16} height={16} className="relative" />
    </a>
  );
};

const PhoneIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    className="opacity-90"
  >
    <path d="M15.2 19.5c-1 0-2-.2-3.1-.6-2.1-.8-4.4-2.4-6.5-4.5-2.1-2.1-3.7-4.4-4.5-6.5C.3 5.5.4 3.6 1.4 2.6l.1-.1L4.1.9a1.5 1.5 0 0 1 2 .5l1.8 2.7a1.5 1.5 0 0 1-.4 2.1l-1 .7c.9 1.4 3.3 4.7 7 7l.7-1c.5-.7 1.5-.9 2.2-.4l2.7 1.8c.7.5.9 1.5.5 2.2L18 18.6l-.1.1c-.6.6-1.6.8-2.7.8Z" />
  </svg>
);

/* ——— SVGs que NO dependen de clases arbitrarias (se ven en cualquier build) ——— */
const AurorasPink = () => (
  <>
    {/* Aurora superior izquierda */}
    <svg
      className="absolute -top-28 -left-40 w-[70rem] h-[32rem] opacity-80 blur-3xl pointer-events-none z-0"
      viewBox="0 0 1200 600"
      aria-hidden
    >
      <defs>
        <linearGradient id="aur1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />{' '}
          {/* rose-400 */}
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.35" />{' '}
          {/* pink-400 */}
        </linearGradient>
      </defs>
      <path
        d="M0,120 C220,40 420,60 600,150 C780,240 980,240 1200,140 L1200,0 L0,0 Z"
        fill="url(#aur1)"
      />
    </svg>

    {/* Aurora inferior derecha */}
    <svg
      className="absolute -bottom-36 -right-40 w-[68rem] h-[30rem] opacity-75 blur-3xl pointer-events-none z-0"
      viewBox="0 0 1200 600"
      aria-hidden
    >
      <defs>
        <linearGradient id="aur2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d="M0,480 C240,560 480,520 720,420 C960,320 1080,300 1200,340 L1200,600 L0,600 Z"
        fill="url(#aur2)"
      />
    </svg>
  </>
);

const StarsPink = () => (
  <div aria-hidden className="absolute inset-0 z-0">
    {/* 10 estrellas con parpadeo (más notorias) */}
    <span className="twinkle absolute top-[8%] left-[10%] w-[3px] h-[3px] rounded-full bg-white/90" />
    <span
      className="twinkle absolute top-[14%] left-[60%] w-[2px] h-[2px] rounded-full bg-white/75"
      style={{ animationDelay: '0.4s' }}
    />
    <span
      className="twinkle absolute top-[24%] left-[30%] w-[4px] h-[4px] rounded-full bg-white/85"
      style={{ animationDelay: '0.8s' }}
    />
    <span
      className="twinkle absolute top-[38%] left-[80%] w-[2px] h-[2px] rounded-full bg-white/70"
      style={{ animationDelay: '1.2s' }}
    />
    <span
      className="twinkle absolute top-[50%] left-[20%] w-[3px] h-[3px] rounded-full bg-white/80"
      style={{ animationDelay: '1.6s' }}
    />
    <span
      className="twinkle absolute top-[60%] left-[65%] w-[2px] h-[2px] rounded-full bg-white/75"
      style={{ animationDelay: '2s' }}
    />
    <span
      className="twinkle absolute top-[68%] left-[45%] w-[3px] h-[3px] rounded-full bg-white/85"
      style={{ animationDelay: '2.4s' }}
    />
    <span
      className="twinkle absolute top-[76%] left-[15%] w-[2px] h-[2px] rounded-full bg-white/75"
      style={{ animationDelay: '2.8s' }}
    />
    <span
      className="twinkle absolute top-[82%] left-[72%] w-[3px] h-[3px] rounded-full bg-white/80"
      style={{ animationDelay: '3.2s' }}
    />
    <span
      className="twinkle absolute top-[34%] left-[52%] w-[4px] h-[4px] rounded-full bg-white/90"
      style={{ animationDelay: '3.6s' }}
    />
  </div>
);
