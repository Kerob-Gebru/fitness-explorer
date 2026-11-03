import { Link } from 'react-router-dom'

const linkGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'All Exercises', to: '/explore' },
      { label: 'Body Parts', to: '/#categories-title' },
      { label: 'Equipment', to: '/explore' },
      { label: 'Exercise Alternatives', to: '/exercises/demo-001#alternatives-title' },
    ],
  },
  {
    title: 'Training',
    links: [
      { label: 'Workout Builder', to: '/workout#builder-title' },
      { label: 'Workout Mode', to: '/workout/session' },
      { label: 'Workout Calendar', to: '/calendar' },
      { label: 'Saved Workouts', to: '/workout#plans' },
    ],
  },
  {
    title: 'Your Progress',
    links: [
      { label: 'Dashboard', to: '/' },
      { label: 'Workout History', to: '/workout#history' },
      { label: 'Goals', to: '/progress' },
      { label: 'Analytics', to: '/progress' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="cinema-footer">
      <img
        className="cinema-footer__image"
        src="/images/fitness-footer-training.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <div className="cinema-footer__content container">
        <div className="cinema-footer__main">
          <section className="cinema-footer__brand" aria-labelledby="cinema-footer-title">
            <p className="cinema-footer__eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
            <h2 className="cinema-footer__brand-name" id="cinema-footer-title">
              FITNESS
              <br />
              <span>EXPLORER</span>
            </h2>
            <p className="cinema-footer__tagline">Find your strength. Build your momentum.</p>
            <p className="cinema-footer__description">
              Discover exercises, create your workouts, and track your progress — one step at a time.
            </p>
            <Link className="cinema-footer__cta" to="/explore">
              <span>Explore Exercises</span>
              <span className="cinema-footer__arrow" aria-hidden="true">→</span>
            </Link>
          </section>

          <nav className="cinema-footer__navigation" aria-label="Footer navigation">
            {linkGroups.map(({ title, links }) => (
              <section className="cinema-footer__group" key={title}>
                <h3>{title}</h3>
                <ul>
                  {links.map(({ label, to }) => (
                    <li key={label}>
                      <Link to={to}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="cinema-footer__group cinema-footer__about">
              <h3>Fitness Explorer</h3>
              <p>A practical space to discover exercises, plan your training, and make progress at your own pace.</p>
            </section>
          </nav>
        </div>

        <div className="cinema-footer__bottom">
          <p>© 2026 Fitness Explorer. All rights reserved.</p>
          <p className="cinema-footer__photo-credit">
            Photo: <a href="https://commons.wikimedia.org/wiki/File:Young_attractive_man_athlete_doing_exercise_with_the_barbell_in_the_gym.jpg" target="_blank" rel="noreferrer">Nenad Stojkovic / Wikimedia Commons</a>
            {' · '}
            <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noreferrer">CC BY 2.0</a>
          </p>
          <p className="cinema-footer__disclaimer">
            Exercise information is for learning only and is not medical or training advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
