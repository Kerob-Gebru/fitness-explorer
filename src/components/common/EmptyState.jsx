// A friendly "nothing here" box. `children` is where action buttons or links go.
export default function EmptyState({ title, text, children }) {
  return (
    <div className="message">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}
