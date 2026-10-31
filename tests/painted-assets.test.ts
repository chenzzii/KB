import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
it('繪製圖集完整、可驗證，與瀏覽器使用的五個檔案相符',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/painted/manifest.json','utf8'));
 expect(manifest.assets.map((a:{file:string})=>a.file).sort()).toEqual(['courtyard-v1.png','portraits-v1.png','props-v1.png','units-v1.png','world-items-v1.png']);
 for(const a of manifest.assets){const bytes=readFileSync(`public/assets/painted/${a.file}`);expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(bytes.readUInt32BE(16)).toBe(a.width);expect(bytes.readUInt32BE(20)).toBe(a.height);expect(a.width).toBeGreaterThanOrEqual(1000);expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256);expect(bytes.length).toBe(a.bytes);}
});
