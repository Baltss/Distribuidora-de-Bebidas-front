import React from 'react';
import { FaWhatsapp, FaInstagram, FaFacebook } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ParticlesBackground from '../Components/ParticlesBackground';
import BannerVideo from '../Images/staff/IMG_6523.mp4';
const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white px-4 py-10 relative overflow-hidden">
      <ParticlesBackground></ParticlesBackground>
      {/* Capa decorativa con blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black/30 rounded-xl blur-3xl opacity-40 z-0 pointer-events-none" />

      {/* Encabezado superior */}
      <header className="text-center mt-4 z-10">
        <p className="text-sm md:text-base text-slate-600 font-light">
          Este sistema web está desarrollado por
        </p>
        <h1 className="titulo uppercase text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mt-1">
          Soft Fusion
        </h1>
      </header>

      {/* Imagen PNG central */}
      <main className="flex-grow flex flex-col items-center justify-center z-10 text-center">
        {/* Imagen PNG */}
        {/* Video dentro del mockup tipo iPhone PRO MEJORADO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 1, delay: 0.2 }}
          viewport={{ once: true, amount: 0.4 }}
          className="relative w-[260px] md:w-[320px] lg:w-[320px] flex justify-center items-center group"
        >
          {/* Glow dinámico detrás */}
          <div className="absolute inset-0 rounded-[3rem] bg-pink opacity-20 blur-3xl group-hover:opacity-40 transition-all duration-700"></div>

          {/* Contenedor del iPhone */}
          <div className="relative w-full rounded-[2.5rem] bg-gradient-to-b from-gray-900 to-black p-3 shadow-2xl border-[6px] border-gray-800">
            {/* Notch superior */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-2xl z-20 shadow-md"></div>

            {/* Botones laterales simulados */}
            <div className="absolute left-[-6px] top-1/3 w-1.5 h-10 bg-gray-700 rounded-r-full"></div>
            <div className="absolute right-[-6px] top-1/2 w-1.5 h-16 bg-gray-700 rounded-l-full"></div>

            {/* Pantalla / Video */}
            <div className="rounded-[2rem] overflow-hidden">
              <motion.video
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                autoPlay
                loop
                muted
                playsInline
                src={BannerVideo}
                className="w-full h-auto block relative z-10 transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        </motion.div>

        {/* Mensaje central */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >

          <p className="mt-10 text-lg md:text-xl text-slate-600 max-w-md mx-auto">
            Conectamos tecnología con tu negocio de forma eficiente e
            innovadora.
          </p>
        </motion.div>
      </main>

      {/* Footer con íconos */}
      <footer className="mb-8 flex gap-8 justify-center items-center text-3xl z-10">
        <motion.a
          href="https://wa.me/5493815430503"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.3, rotate: 5 }}
          className="hover:text-green-400 transition-all"
        >
          <FaWhatsapp />
        </motion.a>

        <motion.a
          href="https://www.instagram.com/softfusiontechnologies/"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.3, rotate: 5 }}
          className="hover:text-pink-400 transition-all"
        >
          <FaInstagram />
        </motion.a>

        <motion.a
          href="https://www.facebook.com/people/SoftFusion-Technologies-SA/61551009572957/?mibextid=wwXIfr&rdid=xMHRwJcwTAbFXbIw&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1JAMUqUEaQ%2F%3Fmibextid%3DwwXIfr"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.3, rotate: 5 }}
          className="hover:text-blue-400 transition-all"
        >
          <FaFacebook />
        </motion.a>
      </footer>
    </div>
  );
};

export default Home;
