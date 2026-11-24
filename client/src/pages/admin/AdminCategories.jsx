import AdminCrud from '../../components/AdminCrud.jsx';

export default function AdminCategories() {
  return (
    <AdminCrud
      title="Categories"
      endpoint="/categories"
      idKey="category_id"
      columns={[
        { key: 'category_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'parent_name', label: 'Parent' },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'parent_id', label: 'Parent category', type: 'select', optionsFrom: { url: '/categories', value: 'category_id', label: 'name' } },
      ]}
    />
  );
}
