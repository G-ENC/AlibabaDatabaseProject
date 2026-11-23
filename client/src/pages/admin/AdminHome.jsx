import { useApi } from '../../useApi.js';
import AdminNav from '../../components/AdminNav.jsx';
import Table from '../../components/Table.jsx';

// One section per required report query (join, group by + order by, subquery).
function Report({ title, description, path }) {
  const { data, loading, error } = useApi(path);
  return (
    <section>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && <Table rows={data} />}
    </section>
  );
}

export default function AdminHome() {
  return (
    <>
      <AdminNav />
      <h1>Reports</h1>
      <Report
        title="1. Order details (JOIN)"
        description="Every order line with buyer, supplier and product, joined from several tables."
        path="/reports/order-details"
      />
      <Report
        title="2. Revenue per supplier (GROUP BY + ORDER BY)"
        description="Total sales per supplier, cancelled orders excluded, highest revenue first."
        path="/reports/supplier-revenue"
      />
      <Report
        title="3. Products priced above their category average (SUBQUERY)"
        description="Compares each product's price with the average price of its category."
        path="/reports/products-above-average"
      />
    </>
  );
}
