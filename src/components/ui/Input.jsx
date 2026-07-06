import './Input.css';

export function Input({ label, error, className = '', id, ...props }) {
  const inputId = id ?? props.name;
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={`field__input ${error ? 'field__input--error' : ''}`} {...props} />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
