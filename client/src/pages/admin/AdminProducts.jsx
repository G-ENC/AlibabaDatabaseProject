import AdminCrud from '../../components/AdminCrud.jsx';

export default function AdminProducts() {
  return (
    <AdminCrud
      title="Products"
      endpoint="/products"
      idKey="product_id"
      columns={[
        { key: 'product_id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'unit_price', label: 'Price' },
        { key: 'stock_quantity', label: 'Stock' },
        { key: 'min_order_qty', label: 'Min. order' },
        { key: 'supplier_name', label: 'Supplier' },
        { key: 'category_name', label: 'Category' },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'unit_price', label: 'Unit price', type: 'number', step: '0.01', required: true },
        { name: 'stock_quantity', label: 'Stock quantity', type: 'number', required: true },
        { name: 'min_order_qty', label: 'Minimum order quantity', type: 'number', required: true },
        { name: 'supplier_id', label: 'Supplier', type: 'select', required: true, optionsFrom: { url: '/suppliers', value: 'supplier_id', label: 'company_name' } },
        { name: 'category_id', label: 'Category', type: 'select', required: true, optionsFrom: { url: '/categories', value: 'category_id', label: 'name' } },
      ]}
    />
  );
}
