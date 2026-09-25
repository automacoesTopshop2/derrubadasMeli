import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

function countCookies(databasePath) {
  try {
    const database = new DatabaseSync(databasePath, { readOnly: true });
    const result = database.prepare("SELECT COUNT(*) AS count FROM cookies WHERE host_key LIKE '%nubimetrics.com'").get();
    database.close();
    return Number(result.count);
  } catch {
    return null;
  }
}

const source = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Profile 5', 'Network', 'Cookies');
const copy = path.join(import.meta.dirname, 'profile5-session-copy', 'Profile 5', 'Network', 'Cookies');

console.log(`Cookies Nubimetrics no Profile 5: ${countCookies(source) ?? 'NÃO FOI POSSÍVEL LER'}`);
console.log(`Cookies Nubimetrics na cópia: ${countCookies(copy) ?? 'NÃO FOI POSSÍVEL LER'}`);
