import { many, one, run } from '../db.js';
import { HttpError } from '../utils/httpError.js';

export async function list() {
  return many('SELECT * FROM supplier ORDER BY company_name');
}

export async function getById(id) {
  return one('SELECT * FROM supplier WHERE supplier_id = $1', [id]);
}

export async function create(s) {
  return one(
    `INSERT INTO supplier (company_name, country, city, contact_email, verified_status, year_established)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [s.company_name, s.country, s.city, s.contact_email, s.verified_status, s.year_established]
  );
}

export async function update(id, s) {
  return one(
    `UPDATE supplier
     SET company_name = $2, country = $3, city = $4, contact_email = $5, verified_status = $6, year_established = $7
     WHERE supplier_id = $1 RETURNING *`,
    [id, s.company_name, s.country, s.city, s.contact_email, s.verified_status, s.year_established]
  );
}

export async function remove(id) {
  // product.supplier_id is ON DELETE RESTRICT; check first for a readable message.
  if (await one('SELECT 1 FROM product WHERE supplier_id = $1 LIMIT 1', [id])) {
    throw new HttpError(409, 'Supplier still has products');
  }
  return (await run('DELETE FROM supplier WHERE supplier_id = $1', [id])) > 0;
}
