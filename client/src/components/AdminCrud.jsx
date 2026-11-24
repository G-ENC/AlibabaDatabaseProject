import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import AdminNav from './AdminNav.jsx';

// One reusable admin page: a table (read), plus a form for create (insert), edit (update), delete.
//
// Props:
//   title     page heading
//   endpoint  REST path, e.g. '/products'
//   idKey     primary key name, e.g. 'product_id'
//   columns   [{ key, label }]  what the table shows
//   fields    [{ name, label, type, required?, step?, optionsFrom? }]  what the form edits
//             type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select'
//             optionsFrom (select only): { url, value, label } loads the choices from the API
export default function AdminCrud({ title, endpoint, idKey, columns, fields }) {
  const { data: rows, loading, error, reload } = useApi(endpoint);
  const [editing, setEditing] = useState(null); // null = form closed, {} = new, row = editing it
  const [form, setForm] = useState({});
  const [options, setOptions] = useState({}); // field name -> [{ value, label }]
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  // Load the choices for select fields once.
  useEffect(() => {
    fields
      .filter((f) => f.optionsFrom)
      .forEach((f) => {
        api.get(f.optionsFrom.url).then((list) => {
          const choices = list.map((r) => ({ value: r[f.optionsFrom.value], label: r[f.optionsFrom.label] }));
          setOptions((current) => ({ ...current, [f.name]: choices }));
        });
      });
  }, []);

  const openForm = (row) => {
    const values = {};
    for (const f of fields) values[f.name] = row?.[f.name] ?? (f.type === 'checkbox' ? false : '');
    setForm(values);
    setEditing(row ?? {});
    setFormError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    // Empty select/number values are sent as null; the server validates the rest.
    const body = {};
    for (const f of fields) {
      const v = form[f.name];
      body[f.name] = f.type === 'number' || f.type === 'select' ? (v === '' ? null : Number(v)) : v;
    }
    try {
      if (editing[idKey]) await api.put(`${endpoint}/${editing[idKey]}`, body);
      else await api.post(endpoint, body);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setPageError('');
    try {
      await api.del(`${endpoint}/${row[idKey]}`);
      reload();
    } catch (err) {
      setPageError(err.message); // e.g. "Product appears in orders and cannot be deleted"
    }
  };

  const show = (v) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v ?? '—');

  const renderField = (f) => {
    const common = { id: f.name, required: f.required };
    if (f.type === 'textarea') return <textarea {...common} rows={3} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />;
    if (f.type === 'checkbox') return <input type="checkbox" id={f.name} checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />;
    if (f.type === 'select') {
      return (
        <select {...common} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
          <option value="">{f.required ? 'Select…' : '— none —'}</option>
          {(options[f.name] ?? []).filter((o) => o.value !== editing?.[idKey]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return <input {...common} type={f.type} step={f.step} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />;
  };

  return (
    <>
      <AdminNav />
      <h1>{title}</h1>
      {!editing && <button onClick={() => openForm(null)}>+ Add new</button>}

      {editing && (
        <article>
          <h3>{editing[idKey] ? `Edit #${editing[idKey]}` : 'Add new'}</h3>
          <form onSubmit={save}>
            {fields.map((f) => (
              <label key={f.name} htmlFor={f.name}>
                {f.type === 'checkbox' && renderField(f)}
                {f.label}{f.required && ' *'}
                {f.type !== 'checkbox' && renderField(f)}
              </label>
            ))}
            {formError && <p className="error">{formError}</p>}
            <div className="row-actions">
              <button type="submit">Save</button>
              <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </article>
      )}

      {pageError && <p className="error">{pageError}</p>}
      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {rows && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[idKey]}>
                  {columns.map((c) => <td key={c.key}>{show(row[c.key])}</td>)}
                  <td>
                    <div className="row-actions">
                      <button className="secondary" onClick={() => openForm(row)}>Edit</button>
                      <button className="secondary" onClick={() => remove(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
