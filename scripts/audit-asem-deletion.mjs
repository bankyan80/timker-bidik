import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Log all remaining students at Asem
const r = await turso.execute("SELECT id, nama, nisn, kelas_kelompok, rombel FROM students WHERE school_npsn = '20215216' ORDER BY nisn");
console.log('Remaining students at SDN 1 Asem:', r.rows.length);
for (const s of r.rows) {
  const nisn = s.nisn ? String(s.nisn).trim() : '-';
  const prefix = nisn.length >= 2 ? nisn.slice(0, 2) : '??';
  console.log(`${prefix} | ${String(s.nama).padEnd(30)} NISN:${nisn.padEnd(12)} ${s.kelas_kelompok} ${s.rombel || '-'}`);
}

// What prefixes are missing vs the original delete list?
const deleteList = [
'3184618754','3185184112','3185508257','3186166179','3186182735','3186796062','3187464520','3187712513','3188257416','3188269624','3188764008','3190213109','3190601943','3190817070','3191024796','3191422056','3191464075','3193518603','3196551235','3196671332','3197327739','3198301116','3199026796','3199036279','3199199060',
'3205116007','3233248922','3263153515','3288549552',
'3341363154','3398829165','3457803765','3624015275','3682792477','3762045602','3827925264','3902777305',
'4046609065','4216426946','4330810660','4397625791','4472575901','4545607227','4577140195','4829993853','4859206937','4878151819','4900047183','4901741562','4938402014',
'5012036150','5020037207','5149657626','5259634185','5417847173','5543361791','5553342157','5596189371','5640373465','5757208628','5806814212','5831062713','5838722647','5844068050','5993176166',
'6021110555','6029817928','6070180390','6111492029','6147378722',
'6343636031','6372238075','6460355927','6475560467','6509446922','6528007880','6530158202','6541851023','6595817418','6620771726','6650472501','6671954327','6733347785','6764544580','6900870448','6978263498','6996866192',
'7052843335','7087429313',
'7319091041','7336277858','7352508583','7393511937','7444964076','7598639449','7612930418','7638010471','7670332788','7687356248','7776315215','7924859461','7978203229',
'8089199673','8172739142','8181321213','8380947533','8525591115','8658580143','8707045761','8723831011','8735739113','8822485770','8829671502','8862813875','8951183203','8963543317',
'9001629787','9018702067','9034405809','9096820232','9192550718','9240159560','9255410065','9305397878','9407511846','9413030413','9427139230','9498750286','9602772817','9622439911','9679730974','9710579993','9758627562','9849527481'
];

const remainingNisns = new Set();
for (const s of r.rows) {
  if (s.nisn) remainingNisns.add(String(s.nisn).trim());
}

const deleted = [];
for (const nisn of deleteList) {
  if (!remainingNisns.has(nisn)) deleted.push(nisn);
}
console.log(`\nDeleted ${deleted.length} students`);
console.log('First 30 deleted NISN:', deleted.slice(0, 30).join(', '));
console.log('Prefix distribution of deleted:');
const prefixCount = {};
for (const nisn of deleted) {
  const p = nisn.slice(0, 2);
  prefixCount[p] = (prefixCount[p] || 0) + 1;
}
for (const [p, c] of Object.entries(prefixCount).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${p}: ${c}`);
}

turso.close();
