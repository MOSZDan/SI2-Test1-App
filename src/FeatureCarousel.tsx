import { useEffect, useState } from 'react'

const slides = [
  {
    title: 'Pagos en línea',
    body: 'Paga tus expensas con un clic y recibe comprobantes digitales al instante.',
  },
  {
    title: 'Reservas de áreas comunes',
    body: 'Agenda el salón o la cancha desde el móvil y evita solapamientos.',
  },
  {
    title: 'Seguridad inteligente',
    body: 'Accesos con QR, lectura de placas y alertas en tiempo real.',
  },
]

export default function FeatureCarousel() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % slides.length), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="promo-panel">
      <div className="promo-inner">
        <div className="promo-badge">Novedades</div>

        <h2 className="promo-title">{slides[i].title}</h2>
        <p className="promo-body">{slides[i].body}</p>

        <div className="promo-dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`promo-dot ${i === idx ? 'is-active' : ''}`}
              onClick={() => setI(idx)}
              aria-label={`Ir al slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
