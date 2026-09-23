import React from "react";

const slides = [
  "/assets/imgs/banner1.jpg",
  "/assets/imgs/banner2.jpg",
  "/assets/imgs/banner3.jpg",
];

const Hero: React.FC = () => {
  return (
    <section className="relative w-full h-[34vh] min-h-[250px] md:h-[42vh] lg:h-[46vh] overflow-hidden">
      <div className="absolute inset-0">
        {slides.map((src, idx) => (
          <div
            key={idx}
            className={`hero-slide hero-slide-${idx}`}
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
            aria-hidden
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-black/40 z-[5]" aria-hidden></div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pt-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tighter text-white drop-shadow-2xl">
          HURIOS RALLY
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/90 drop-shadow-md md:text-base lg:text-lg">
          Bienvenido a nuestra tienda online - repuestos y accesorios con garantía.
        </p>
      </div>
    </section>
  );
};

export default Hero;
