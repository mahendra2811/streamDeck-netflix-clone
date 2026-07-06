import './Button.css';

export function Button({ variant = 'primary', size = 'md', as: As = 'button', className = '', ...props }) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim();
  return <As className={classes} {...props} />;
}
