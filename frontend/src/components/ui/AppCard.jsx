export default function AppCard({ children, className = '', style = {}, as = 'div' }) {
  const Tag = as;
  return (
    <Tag className={`rf-panel ${className}`.trim()} style={style}>
      {children}
    </Tag>
  );
}
