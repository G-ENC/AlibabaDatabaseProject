import AdminCrud from '../../components/AdminCrud.jsx';

export default function AdminSuppliers() {
  return (
    <AdminCrud
      title="Suppliers"
      endpoint="/suppliers"
      idKey="supplier_id"
      columns={[
        { key: 'supplier_id', label: 'ID' },
        { key: 'company_name', label: 'Company' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        { key: 'contact_email', label: 'Email' },
        { key: 'verified_status', label: 'Verified' },
        { key: 'year_established', label: 'Est.' },
      ]}
      fields={[
        { name: 'company_name', label: 'Company name', type: 'text', required: true },
        { name: 'country', label: 'Country', type: 'text', required: true },
        { name: 'city', label: 'City', type: 'text' },
        { name: 'contact_email', label: 'Contact email', type: 'text' },
        { name: 'year_established', label: 'Year established', type: 'number' },
        { name: 'verified_status', label: 'Verified supplier', type: 'checkbox' },
      ]}
    />
  );
}
