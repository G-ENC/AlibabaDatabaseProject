export const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const date = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB') : '—');
export const stars = (n) => (n ? '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)) : 'No ratings');
