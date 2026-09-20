import {copyFileSync,readFileSync,mkdirSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('deployments/genlayer-studio-next.json','utf8'));
if(manifest.chainId!==61997 || !manifest.usableForProofs || manifest.smoke.status!=='SUCCESS')throw new Error('Require verified Studio Next deployment');
copyFileSync('deployments/genlayer-studio-next.json','public/genlayer-studio-next.json');
copyFileSync('deployments/genlayer-next-examples.json','public/genlayer-next-examples.json');
mkdirSync('public/docs',{recursive:true});
for(const file of ['STUDIO-NEXT.md','HACKATHON.md','DEMO.md','RESULTS.md','guide.html'])copyFileSync('docs/'+file,'public/docs/'+file);
console.log('Published Studio Next proof and guide; historical artifacts stay in archive.');
