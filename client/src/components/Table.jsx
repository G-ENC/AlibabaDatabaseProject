// Shows any array of flat objects as a table; column titles come from the keys.
export default function Table({ rows }) {
  if (!rows || rows.length === 0) return <p className="muted">Nothing here yet.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{columns.map((c) => <td key={c}>{String(row[c] ?? '—')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
