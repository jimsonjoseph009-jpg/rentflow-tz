export default function AppToolbar({ children, className = '', style = {} }) {
  return (
    <div className={`rf-toolbar ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
