const services = [
  { title: 'Executive Search', text: 'Finding leaders who shape your company.' },
  { title: 'Specialist Hiring', text: 'Targeted search for hard-to-find talent.' },
  { title: 'Career Coaching', text: 'Helping candidates find their next step.' },
]

export default function App() {
  return (
    <>
      <header className="hero">
        <h1>Goetti Recruitment</h1>
        <p>Connecting great people with great companies.</p>
        <a className="button" href="#contact">Get in touch</a>
      </header>

      <main>
        <section className="services">
          {services.map((s) => (
            <article key={s.title} className="card">
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </article>
          ))}
        </section>

        <section id="contact" className="contact">
          <h2>Contact</h2>
          <p>
            <a href="mailto:info@example.com">info@example.com</a>
          </p>
        </section>
      </main>

      <footer>© {new Date().getFullYear()} Goetti Recruitment</footer>
    </>
  )
}
