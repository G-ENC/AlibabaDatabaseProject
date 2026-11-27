// Shows a status like "IN_TRANSIT" as a coloured "in transit" label.
export default function StatusBadge({ status }) {
  const key = status.toLowerCase();
  return <span className={`badge ${key}`}>{key.replace('_', ' ')}</span>;
}
