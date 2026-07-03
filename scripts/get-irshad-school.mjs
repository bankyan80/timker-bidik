import { createClient } from '@libsql/client';
const src = createClient({
  url: 'libsql://laporan-pendidikan-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIwMzk3MTMsImlkIjoiMDE5ZWU5ZDctZjcwMS03NDYxLWI2YTQtMzIyNTM3YjY0ZGI3IiwicmlkIjoiMGU2NDhiZTAtY2FlNy00NjEwLWEyODMtZDA4YzEzZGQ4MjllIn0.ZPMXTMXMKUO5s9Wv_NGdg0gcKv4PYcbjxOciF9wEVVlDKIodVqA_WhtzSVdZIOTyx_GEIYa_tVGx9TCKK31oAQ'
});
const r = await src.execute("SELECT * FROM schools WHERE npsn = '20215221'");
console.log(JSON.stringify(r.rows, null, 2));
