import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';
import { pick } from '../utils/validate.js';

const FIELDS = ['company_name', 'country', 'city', 'contact_email', 'verified_status', 'year_established'];

export async function list() {
  return db.suppliers;
}

export async function getById(id) {
  return db.suppliers.find((s) => s.supplier_id === id) ?? null;
}

export async function create(data) {
  const supplier = { supplier_id: nextId('suppliers', 'supplier_id'), verified_status: false, ...pick(data, FIELDS) };
  db.suppliers.push(supplier);
  return supplier;
}

export async function update(id, data) {
  const s = db.suppliers.find((x) => x.supplier_id === id);
  if (!s) return null;
  Object.assign(s, pick(data, FIELDS));
  return s;
}

export async function remove(id) {
  const index = db.suppliers.findIndex((s) => s.supplier_id === id);
  if (index === -1) return false;
  if (db.products.some((p) => p.supplier_id === id)) throw new HttpError(409, 'Supplier still has products');
  db.suppliers.splice(index, 1);
  return true;
}
