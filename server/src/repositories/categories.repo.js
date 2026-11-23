import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';
import { pick } from '../utils/validate.js';

const FIELDS = ['name', 'description', 'parent_id'];

const withParentName = (c) => ({
  ...c,
  parent_name: db.categories.find((p) => p.category_id === c.parent_id)?.name ?? null,
});

export async function list() {
  return db.categories.map(withParentName);
}

export async function getById(id) {
  const c = db.categories.find((x) => x.category_id === id);
  return c ? withParentName(c) : null;
}

export async function create(data) {
  const category = { category_id: nextId('categories', 'category_id'), description: null, parent_id: null, ...pick(data, FIELDS) };
  db.categories.push(category);
  return withParentName(category);
}

export async function update(id, data) {
  const c = db.categories.find((x) => x.category_id === id);
  if (!c) return null;
  Object.assign(c, pick(data, FIELDS));
  return withParentName(c);
}

export async function remove(id) {
  const index = db.categories.findIndex((c) => c.category_id === id);
  if (index === -1) return false;
  if (db.products.some((p) => p.category_id === id)) throw new HttpError(409, 'Category still has products');
  if (db.categories.some((c) => c.parent_id === id)) throw new HttpError(409, 'Category still has sub-categories');
  db.categories.splice(index, 1);
  return true;
}
