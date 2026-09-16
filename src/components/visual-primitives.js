/* Visual primitives shared by all four screens. No screen is a screenshot. */
const ForgeUI = (() => {
  const paths = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    target:'<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-9M16 3v5h5"/>',
    wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M20 12h-6v5h6"/><path d="M16 14.5h.1"/>',
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    checkbox:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
    star:'<path d="m12 2 3 6.3 7 .9-5 5 .9 7-5.9-3.3L6 21l1-6.8-5-5 7-.9z" fill="currentColor" stroke-width="1"/>',
    bars:'<path d="M5 19v-6M12 19V5M19 19V9" stroke-width="3.4"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>', plus:'<path d="M12 4v16M4 12h16"/>',
    arrow:'<path d="M5 19 19 5M7 5h12v12"/>', down:'<path d="M12 3v17M5 13l7 7 7-7"/>',
    pie:'<path d="M11 3a9 9 0 1 0 10 10H11zM15 2v7h7a8 8 0 0 0-7-7z"/>',
    coins:'<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v4c0 4 14 4 14 0V5M5 9v4c0 4 14 4 14 0V9M5 13v4c0 4 14 4 14 0v-4"/>',
    fork:'<path d="M5 3v7M2 3v4c0 4 6 4 6 0V3M5 10v11M17 3v18M17 3c-5 2-5 10 0 10"/>',
    bus:'<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2M16 19v2M8 15h.1M16 15h.1"/>',
    book:'<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-2-10 1z"/>',
    game:'<path d="M7 7h10c5 0 7 14 3 13l-5-4H9l-5 4C0 21 2 7 7 7zM6 10v5M3.5 12.5h5M16 11h.1M19 14h.1"/>',
    more:'<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0M10 13v3h4v-3"/>',
    cart:'<path d="M2 3h3l3 12h11l3-9H6M9 20h.1M18 20h.1"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    lock:'<rect x="5" y="10" width="14" height="12" rx="3" fill="currentColor"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/><path d="M12 15v3" stroke="#1e2e31"/>',
    bell:'<path d="M5 9a7 7 0 0 1 14 0v7l2 3H3l2-3zM9 22h6"/>',
    moon:'<path d="M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12z"/>',
    settings:'<path d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 2v3l-2 2-1 3h-5l-1-3-3-2-2-1v-4l2-2V5z" transform="translate(1 1) scale(.92)"/><circle cx="12" cy="11" r="3"/>',
    flame:'<path d="M13 2c1 7-5 7-2 12 3-1 4-4 4-6 7 6 5 14-3 14-9 0-12-9-5-14-1 4 0 5 1 6 2-4 0-7 5-12z" fill="currentColor"/>',
    logout:'<path d="M9 3H3v18h6M9 12h13m-5-5 5 5-5 5"/>',
    bank:'<path d="m2 7 10-5 10 5zM4 10v9M9 10v9M15 10v9M20 10v9M2 22h20"/>'
  };
  const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.star}</svg>`;
  const esc = str => String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2,minimumFractionDigits:Number.isInteger(n)?0:2}).format(n);
  // True dot-matrix numerals, independent of font availability.
  const glyphs={0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110'],'.':['0','0','0','0','0','0','1'],',':['0','0','0','0','0','1','1'],'%':['11001','11001','00010','00100','01000','10011','10011'],R:['11110','10001','10001','11110','10100','10010','10001'],'$':['00100','01111','10100','01110','00101','11110','00100'],' ':['00','00','00','00','00','00','00'],'/':['00001','00001','00010','00100','01000','10000','10000'],'+':['000','010','010','111','010','010','000'],'−':['000','000','000','111','000','000','000']};
  function dots(value,cls=''){let x=0,circles='';for(const c of String(value)){const rows=glyphs[c]||glyphs[' '];for(let y=0;y<7;y++)for(let k=0;k<rows[y].length;k++)if(rows[y][k]==='1')circles+=`<circle cx="${x+k*4+2}" cy="${y*4+2}" r="1.35"/>`;x+=(rows[0].length+1)*4;}return `<svg class="dot-number ${cls}" role="img" aria-label="${esc(value)}" viewBox="0 0 ${Math.max(1,x-3)} 28">${circles}</svg>`;}
  function progress(p,cls=''){p=Math.min(100,Math.max(0,p));return `<div class="progress-track ${cls}" role="progressbar" aria-label="Progresso" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="--progress:${p}%"></div><i class="progress-divider"></i><div class="progress-empty"></div></div>`;}
  let serial=0;
  function art(name){const id='art'+(++serial);const defs=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b8fbff"/><stop offset=".36" stop-color="#2dc3d5"/><stop offset=".72" stop-color="#086779"/><stop offset="1" stop-color="#032d39"/></linearGradient><linearGradient id="${id}m"><stop stop-color="#d0dddd"/><stop offset=".38" stop-color="#6c797d"/><stop offset=".7" stop-color="#1c2d34"/><stop offset="1" stop-color="#90a3a9"/></linearGradient></defs>`;let body='';
    if(name==='dumbbell')body=`<g transform="rotate(32 32 32)"><rect x="11" y="28" width="42" height="8" rx="3" fill="url(#${id}m)"/><g fill="url(#${id})" stroke="#7adce6" stroke-width=".7"><rect x="10" y="18" width="9" height="28" rx="4"/><rect x="4" y="23" width="8" height="18" rx="4"/><rect x="45" y="18" width="9" height="28" rx="4"/><rect x="53" y="23" width="7" height="18" rx="3"/></g></g>`;
    else if(name==='book')body=`<path d="M32 14Q17 5 5 14v37q14-9 27-1 15-8 27 1V14q-15-9-27 0z" fill="url(#${id})" stroke="#68c9d7"/><path d="M32 14v36M8 16v30q11-6 20 0M56 16v30q-11-6-20 0" fill="none" stroke="#c1f8fb" stroke-opacity=".5"/>`;
    else if(name==='laptop')body=`<path d="m14 7 39 5-5 32-40-5z" fill="#12242c" stroke="#89a6ad" stroke-width="2"/><path d="m17 10 32 4-4 26-33-4z" fill="url(#${id})"/><path d="m8 39 40 5 13 9-42 5L2 49z" fill="url(#${id}m)"/><path d="m24 46 12 2 3 4-14-1z" fill="#71888c"/>`;
    else if(name==='coins')body=`<g fill="url(#${id}m)" stroke="#738c91"><ellipse cx="31" cy="37" rx="21" ry="16"/><path d="M15 30 8 23 9 37M47 28l8 1v11l-7 2M17 48v8h7v-5M39 50v6h7v-9"/></g><circle cx="45" cy="32" r="2" fill="#000"/><path d="M25 23h14" stroke="#000" stroke-width="3"/><circle cx="31" cy="13" r="9" fill="#e6bb5b" stroke="#ffdf9b"/><text x="31" y="17" text-anchor="middle" fill="#9c691c" font-size="12">$</text>`;
    else if(name==='stack')body=`<g fill="url(#${id})" stroke="#83d8e3" stroke-width=".8"><path d="m6 40 30-9 23 8v10l-30 10-23-9z"/><path d="m6 25 30-9 23 8v10L29 44 6 35z"/><path d="m6 10 30-8 23 8v10L29 30 6 20z"/></g><path d="m10 19 19 7 26-9M10 34l19 7 26-9M10 49l19 7 26-9" fill="none" stroke="#c9e5e5" stroke-width="3"/>`;
    else body=`<path d="M35 3c3 15-10 16-7 29 8-1 12-8 11-15 19 18 15 40-5 44C7 60 3 39 19 22c-3 11 2 14 5 16 4-9-4-19 11-35z" fill="url(#${id})" stroke="#a5edf1" stroke-width=".6"/><path d="M33 37c-9 9-10 15-1 22 12-4 11-12 1-22" fill="#06313d"/>`;
    return `<svg class="mini-art" viewBox="0 0 64 64" aria-hidden="true">${defs}${body}</svg>`;
  }
  function badge(type,locked=false){const id='badge'+(++serial);return `<span class="hex-badge ${locked?'locked':''}"><svg class="badge-frame" viewBox="0 0 80 88" aria-hidden="true"><defs><linearGradient id="${id}" x2="1" y2="1"><stop stop-color="#123940"/><stop offset=".45" stop-color="#0b4a56"/><stop offset="1" stop-color="#051619"/></linearGradient><linearGradient id="${id}e" x2="1" y2="1"><stop stop-color="#c3faff"/><stop offset=".35" stop-color="#10b9cd"/><stop offset=".65" stop-color="#083b47"/><stop offset="1" stop-color="#60e6f2"/></linearGradient></defs><path d="M40 1 78 23v42L40 87 2 65V23Z" fill="#051014" stroke="#114653"/><path d="M40 5 74 25v38L40 83 6 63V25Z" fill="url(#${id})" stroke="url(#${id}e)" stroke-width="2"/><path d="M40 11 68 28v32L40 77 12 60V28Z" fill="none" stroke="#49dfed" stroke-opacity=".14"/></svg>${locked?icon('lock'):art(type)}</span>`;}
  function gauge(p){let circles='';for(let i=0;i<24;i++){const a=Math.PI+i*Math.PI/23;circles+=`<circle class="${i/23<=p/100?'on':''}" cx="${70+56*Math.cos(a)}" cy="${73+56*Math.sin(a)}" r="2.9"/>`;}return `<svg class="gauge" viewBox="0 0 140 90" role="img" aria-label="${p}% do orçamento usado">${circles}<text x="70" y="57" text-anchor="middle">${p}%</text><text class="gauge-caption" x="70" y="72" text-anchor="middle">${p<=75?'Sob controle':'Acompanhe os gastos'}</text></svg>`;}
  return {icon,esc,money,dots,progress,art,badge,gauge};
})();

export default ForgeUI;

