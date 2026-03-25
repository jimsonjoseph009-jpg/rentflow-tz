export default function AppTable({ headers = [], children }) {
  return (
    <div className="rf-table-wrap">
      <table className="rf-table">
        {headers.length ? (
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
