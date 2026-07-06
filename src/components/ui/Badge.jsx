import './Badge.css';

export function Badge({ children, tone = 'accent', className = '' }) {
  return <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>;
}
