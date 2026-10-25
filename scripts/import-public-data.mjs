import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL || !process.argv[2]) throw new Error('DATABASE_URL and reviewed JSON export path are required');
const source=JSON.parse(await readFile(process.argv[2],'utf8'));
const columns={
 counselors:['id','full_name','headline','avatar_url','specialties','bio','standard_price','premium_price','rating','reviews_count','available_slots','company','why_work_with_me','joined_at','commission_free_until','price_per_question','soft_cap','is_active'],
 forum_questions:['id','student_name_or_anonymous','category','title','body','created_at'],
 forum_answers:['id','question_id','counselor_id','body','created_at'],
};
const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();
try {
 await client.query('BEGIN');
 for(const [table,keys] of Object.entries(columns)) {
  if(!Array.isArray(source[table])) throw new Error('Missing export table '+table);
  let inserted=0;
  for(const row of source[table]) {
   if(table==='counselors' && !/^\/api\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(row.avatar_url)) throw new Error('Counselor images must be copied to local storage first');
   const result=await client.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT(id) DO NOTHING`,keys.map(key=>row[key]??null));
   inserted+=result.rowCount;
  }
  console.log(`${table}: ${inserted} imported; ${source[table].length} source records`);
 }
 await client.query(`INSERT INTO mentor_tracks(mentor_id,track_id,is_primary)
   SELECT c.id,t.id,(t.slug=c.specialties[1]) FROM counselors c JOIN tracks t ON t.slug=ANY(c.specialties)
   ON CONFLICT(mentor_id,track_id) DO NOTHING`);
 await client.query('COMMIT');
} catch(error) {await client.query('ROLLBACK');throw error;} finally {await client.end();}
