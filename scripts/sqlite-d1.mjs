import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

// Local/test adapter runs the same migration and SQL as hosted D1.
export function sqliteD1(filename=':memory:') {
  const sqlite=new DatabaseSync(filename);
  sqlite.exec(readFileSync(new URL('../drizzle/0000_battleship_rooms.sql',import.meta.url),'utf8'));
  return {sqlite,prepare(sql){const statement=sqlite.prepare(sql);let args=[];
    const wrapper={bind(...values){args=values;return wrapper;},async first(){return statement.get(...args)||null;},
      async run(){const r=statement.run(...args);return{success:true,meta:{changes:Number(r.changes)}};}};
    return wrapper;}};
}
