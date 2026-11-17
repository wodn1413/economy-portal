// 저장소 추상화: Netlify 배포 시 Netlify Blobs, 로컬(npm run dev)에서는 JSON 파일.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
let blobs = null;
async function blobStore() {
  if (!blobs) {
    const { getStore } = await import('@netlify/blobs');
    blobs = getStore({ name: 'members', consistency: 'strong' });
  }
  return blobs;
}

const localFile = path.resolve(process.env.LOCAL_STORE_FILE || '.data/store.json');
async function readLocal() {
  try { return JSON.parse(await fs.readFile(localFile, 'utf8')); } catch { return {}; }
}
async function writeLocal(data) {
  await fs.mkdir(path.dirname(localFile), { recursive: true });
  await fs.writeFile(localFile, JSON.stringify(data, null, 2));
}

export async function getJSON(key) {
  if (onNetlify) return (await (await blobStore()).get(key, { type: 'json' })) ?? null;
  return (await readLocal())[key] ?? null;
}
export async function setJSON(key, value) {
  if (onNetlify) return (await blobStore()).setJSON(key, value);
  const data = await readLocal(); data[key] = value; await writeLocal(data);
}
export async function del(key) {
  if (onNetlify) return (await blobStore()).delete(key);
  const data = await readLocal(); delete data[key]; await writeLocal(data);
}
export async function listKeys(prefix) {
  if (onNetlify) {
    const { blobs: items } = await (await blobStore()).list({ prefix });
    return items.map(b => b.key);
  }
  return Object.keys(await readLocal()).filter(k => k.startsWith(prefix));
}
