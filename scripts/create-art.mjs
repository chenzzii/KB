import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('../public/assets/original/',import.meta.url);mkdirSync(dir,{recursive:true});
const entries=[];
function asset(file,title,body,w=96,h=96){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img"><title>${title}</title>${body}</svg>`;writeFileSync(new URL(file,dir),svg);entries.push({file,title,origin:'Original procedural vector art created for 九州兵譜; no source-game imagery',sha256:createHash('sha256').update(svg).digest('hex')});}
const colors=['#6e8660','#527d87','#648875','#bb7d51','#746484'];
const motifs=[
 '<path d="M20 65L68 20M22 20L72 68M16 53L31 66M56 17L72 32"/>',
 '<path d="M12 50L46 38L71 12L60 43L85 57L54 53L43 80L41 55Z"/>',
 '<path d="M48 16L70 26V52Q65 71 48 81Q31 71 26 52V26Z M48 28V68M35 40H61"/>',
 '<path d="M18 69L24 34L40 45L59 31L71 40L83 61L66 69L55 57L43 76L28 78Z M26 34L30 18L39 41M64 33L75 20L74 46"/>',
 '<path d="M29 25Q48 7 67 25V46L60 53V65H36V53L29 46ZM38 32H42M55 32H59M48 41V46M42 54V61M54 54V61M25 78L72 67M25 67L72 78"/>',
 '<path d="M28 77V43Q25 18 48 17Q71 18 68 43V77M35 27L61 52M34 52L61 31M20 60H75M41 16V48H54V16"/>',
 '<path d="M20 76L63 28M54 15L76 36L64 48L42 27ZM14 68L24 78M34 77H79L70 66H44Z"/>',
 '<path d="M16 63L78 29M32 26Q70 21 76 65M26 28L76 65M33 57L46 81M68 20L83 30"/>',
 '<path d="M30 14Q77 48 30 82L42 48ZM20 48H83M72 40L83 48L72 56"/>',
 '<path d="M31 12Q83 48 31 84L47 48ZM16 48H85M63 17L55 27M63 78L54 68M73 27L65 33"/>',
 '<path d="M28 81L66 15M61 13L78 8L72 27M17 58H45L49 79H21ZM24 62V74M32 62V74M40 62V74"/>',
 '<path d="M16 79L75 17L77 38L30 78ZM31 40L56 65M48 66L61 80"/>',
 '<path d="M21 26H61V77H21ZM30 35H52V67H30ZM75 18V81M65 18H85V32H65Z"/>',
 '<path d="M18 80Q24 60 23 39Q26 13 48 13Q73 14 73 42L80 82L62 71L49 83L36 70ZM36 38L42 41M55 41L62 38"/>',
 '<path d="M27 29L38 17H61L72 29V76H24ZM31 42H65M30 52H65M29 62H66M37 24V73M51 24V73M64 24V73"/>',
 '<path d="M19 77L25 36L16 23L38 28L48 12L61 29L81 22L72 39L77 77M31 43L40 49M56 49L66 43M37 64L48 70L60 64"/>',
 '<path d="M27 81L34 56L20 34L31 23L47 40L63 19L77 30L65 56L73 81M31 49L66 49M42 60L37 78M55 60L61 78"/>',
 '<path d="M32 81L38 47L24 35L13 18M34 42L38 19L50 10M55 81L52 44L68 31L80 15M56 44L73 48L86 40M31 82L19 88M57 81L74 88"/>',
 '<path d="M16 72L23 43L42 46L57 25L73 24L81 38L65 44L63 70M27 70L22 85M56 68L64 85M38 47L44 17L52 28M48 19L73 9"/>',
 '<path d="M28 76L33 35L48 18L63 35L70 76ZM24 78H76M17 19V80M11 17H24M40 44H56M48 36V60"/>',
 '<path d="M18 78Q42 59 31 41L48 16L64 41Q56 61 80 79ZM28 81Q48 68 68 81M48 35V62M38 48H59M13 52L23 48M75 42L84 48"/>',
 '<path d="M12 25L31 37L48 15L65 37L84 25L74 66L57 57L48 83L38 57L22 66ZM38 39L43 43M53 43L59 39"/>',
 '<path d="M12 78L25 54L18 34L33 21L49 35L64 18L81 34L73 58L84 78M32 44L53 60M59 38L40 70M25 65L70 65"/>',
 '<path d="M12 20L31 34L48 13L65 34L84 20L74 62L61 55L48 81L35 55L22 62M39 39L45 42M53 42L60 39M66 82L77 19Q46 12 54 34"/>',
 '<path d="M14 70Q3 41 28 43Q54 50 39 68Q29 85 62 80Q90 69 68 54Q49 42 62 29L82 33L75 17L58 22L46 16M58 29L49 38M67 40L79 47M24 50L17 32M53 72L53 59"/>'
];
const roster=JSON.parse(readFileSync(new URL('../data/content/troop_mapping.json',import.meta.url),'utf8'));
roster.forEach((u,i)=>asset(`unit-${i}.svg`,u.name,`<rect x="4" y="4" width="88" height="88" rx="18" fill="${colors['ABCDE'.indexOf(u.factionGroup)]}"/><circle cx="48" cy="48" r="36" fill="none" stroke="#fff2"/><g fill="none" stroke="#faf4dd" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${motifs[i]}</g>`));
const tileArt={plain:'<path d="M6 23l2-4 3 4M21 13l2-3 2 3"/>',forest:'<path d="M7 26V8M2 17L7 9L12 17M2 22L7 14L12 22M23 28V5M16 16L23 6L30 16M16 23L23 13L30 23"/>',mountain:'<path d="M1 28L12 6L21 28M14 28L24 12L32 28M8 13L12 15L15 12"/>',water:'<path d="M0 8Q8 2 16 8T32 8M0 17Q8 11 16 17T32 17M0 26Q8 20 16 26T32 26"/>',road:'<path d="M12 0L10 32M21 0L22 32"/>',bridge:'<path d="M3 29V7M29 29V7M3 13Q16 0 29 13M3 24Q16 12 29 24M9 10V20M16 7V18M23 10V20"/>',marsh:'<path d="M0 26Q8 20 16 26T32 26M8 19V4M3 6L8 11L12 6M22 22V10M18 12L22 17L27 11"/>',ruins:'<path d="M3 27L10 8L19 27M15 27L26 3L30 27M8 18L14 18M22 12L28 12"/>'};
const tileColors={plain:'#dbe4c6',forest:'#a6c5a0',mountain:'#7d8f86',water:'#9fc7ca',road:'#e4d1a8',bridge:'#c6b793',marsh:'#b2c6ac',ruins:'#cfa98a'};
for(const [key,body] of Object.entries(tileArt))asset(`tile-${key}.svg`,key,`<path fill="${tileColors[key]}" d="M0 0H32V32H0Z"/><g stroke="#395c4d" stroke-opacity=".45" stroke-width="1.2" fill="none">${body}</g>`,32,32);
const buildings={city:'<path d="M12 75V38H84V75ZM7 38L48 12L89 38ZM31 75V51H65V75M3 78H93M20 30L48 22L76 30"/>',camp:'<path d="M9 79L48 16L87 79ZM34 79L48 51L63 79M48 16V5L73 13L48 20"/>',foe:'<path d="M20 78L76 18M20 18L76 78M12 64L32 84M64 12L84 32M12 32L32 12M64 84L84 64"/>',bandit:'<path d="M11 79V40L25 20L39 40V79M57 79V40L71 20L85 40V79M39 52H57M39 66H57"/>',shrine:'<path d="M12 78H84M20 75V36H76V75M7 35L48 12L89 35M33 75V49H63V75M36 18V9M60 18V9"/>',beacon:'<path d="M22 82L30 42H66L74 82ZM28 53H69M24 68H72M40 39Q27 24 45 9Q44 25 60 13Q76 33 57 39Z"/>'};
for(const [key,body] of Object.entries(buildings))asset(`place-${key}.svg`,key,`<circle cx="48" cy="48" r="45" fill="#f8f0d8"/><g stroke="#234c43" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">${body}</g>`);
for(let i=0;i<14;i++)asset(`spell-${i}.svg`,`符籙 ${i+1}`,`<path d="M22 7H74L70 89H26Z" fill="#f4dfac" stroke="#b39059" stroke-width="2"/><g fill="none" stroke="${i<7?'#9b493c':'#386d67'}" stroke-width="3"><path d="M36 19H60M48 18V38L${30+i%5*3} 52L65 62L38 78M30 39H66"/><circle cx="48" cy="49" r="${9+i%4*2}"/></g>`);
for(let i=0;i<8;i++)asset(`artifact-${i}.svg`,`神器 ${i+1}`,`<rect x="8" y="8" width="80" height="80" rx="20" fill="#e0c889"/><g fill="none" stroke="#66502e" stroke-width="4">${[motifs[11],motifs[2],motifs[14],'<path d="M25 14H72V82H25ZM35 30H61M35 44H61M35 58H61"/>',motifs[20],'<circle cx="48" cy="48" r="26"/><circle cx="48" cy="48" r="12"/>','<path d="M10 20Q32 14 48 27Q64 14 86 20V77Q64 70 48 83Q32 70 10 77ZM48 27V83"/>','<path d="M48 9V74M32 24H64M14 57Q48 93 82 57M12 51V66M84 51V66"/>'][i]}</g>`);
for(let i=0;i<4;i++)asset(`hero-${i}.svg`,['武將','儒將','豪俠','方士'][i],`<rect x="3" y="3" width="90" height="90" rx="20" fill="${colors[i]}"/><g fill="#f0dfb8" stroke="#273e36" stroke-width="2"><path d="M17 91Q18 65 39 63H57Q78 65 79 91"/><path d="M31 36Q31 18 48 18Q65 18 65 36V49Q62 66 48 66Q34 65 31 49Z"/><path d="M27 35L35 ${12+i*2}H61L69 35Z" fill="#2f4e49"/><path d="M38 43H42M54 43H58M45 55H52" fill="none"/></g>`);
const foes=JSON.parse(readFileSync(new URL('../data/content/villain_mapping.json',import.meta.url),'utf8'));
foes.forEach((f,i)=>asset(`foe-${i}.svg`,f.name,`<rect x="3" y="3" width="90" height="90" rx="16" fill="${colors[i%5]}"/><path d="M12 91L27 63L21 31L${32+i%4*3} 12L48 24L${66-i%3*3} 12L75 31L69 64L84 91" fill="#293f3b" stroke="#dec79e" stroke-width="2"/><path d="M32 43L43 48M54 48L65 43M39 66L48 71L58 66" fill="none" stroke="#f4dfb6" stroke-width="3"/>`));
for(const [i,title] of ['青禾曉色','竹隱聽雨','赤嶺烽火','百川盟誓'].entries())asset(`scene-${i}.svg`,title,`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${['#c6d9ce','#b5cfcb','#d4b494','#ccd5c7'][i]}"/><stop offset="1" stop-color="#f5efd8"/></linearGradient></defs><path fill="url(#sky)" d="M0 0H960V280H0Z"/><circle cx="730" cy="65" r="32" fill="#f8e8b5"/><path d="M0 195L130 52L280 188L440 87L590 195L790 40L960 190V280H0" fill="#6e9789" opacity=".4"/><path d="M0 245L155 136L300 248L520 145L710 238L960 127V280H0" fill="#426f63" opacity=".55"/><path d="M0 270Q220 220 450 260T960 235" stroke="#e3edd4" stroke-width="18" fill="none"/><path d="M690 230V167H765V230M681 167L728 139L777 167M716 230V198H742V230" stroke="#284e45" stroke-width="4" fill="#d3cead"/>`,960,280);
writeFileSync(new URL('manifest.json',dir),JSON.stringify({license:'CC0-1.0',style:'Original vector ink-and-jade icon system',assets:entries},null,2)+'\n');console.log(`Created ${entries.length} original SVG assets`);
