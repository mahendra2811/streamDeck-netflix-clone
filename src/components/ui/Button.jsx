import './Button.css';

export function Button({ variant = 'primary', size = 'md', active = false, as: As = 'button', className = '', ...props }) {
  const classes = `btn btn--${variant} btn--${size} ${active ? 'btn--active' : ''} ${className}`.trim();
  return <As className={classes} {...props} />;
}
