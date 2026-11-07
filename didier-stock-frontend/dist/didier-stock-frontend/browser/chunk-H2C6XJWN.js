import{j as H}from"./chunk-DXWUTMY7.js";import{a as L}from"./chunk-PFSL2SMV.js";import{K as P,P as C}from"./chunk-QQ7LVGX3.js";import{a as F}from"./chunk-DP6XK2WQ.js";import{d as I}from"./chunk-UJAGF44V.js";import{e as B,f as E}from"./chunk-CWTPBX7D.js";var O=B(F());var j=(()=>{class y{constructor(t,i){this.api=t,this.auth=i,this.settings=null,this.currency="DT",this.W_PX=272,this.A4_W_PX=794}loadSettings(t){this.settings=t,this.currency=t?.currency==="TND"?"DT":t?.currency||"DT"}print(t){let i=["FACTURE","DEVIS","BON_LIVRAISON"];if(t?.id&&i.includes(t.type)){this.printServerPdf(t);return}this.settings?this.doPrintA4(t):this.api.getCompanySettings().subscribe({next:e=>{this.settings=e,this.currency=e.currency||"TND",this.doPrintA4(t)},error:()=>{this.settings={},this.doPrintA4(t)}})}printServerPdf(t){(this.auth.getToken()?this.api.getInvoicePdf(t.id):this.api.getPublicInvoicePdf(t.id)).subscribe({next:e=>{let l=t.type==="FACTURE"?"FACTURE":t.type==="DEVIS"?"DEVIS":"BON_LIVRAISON",r=window.URL.createObjectURL(e),d=document.createElement("a");d.href=r,d.download=`${l}-${t.number||"document"}.pdf`,document.body.appendChild(d),d.click(),document.body.removeChild(d),window.URL.revokeObjectURL(r)},error:()=>{this.settings?this.doPrintA4(t):this.api.getCompanySettings().subscribe({next:e=>{this.settings=e,this.currency=e.currency||"TND",this.doPrintA4(t)},error:()=>{this.settings={},this.doPrintA4(t)}})}})}printPurchaseOrder(t){this.print({type:"BON_COMMANDE",number:t.number,date:t.date,dueDate:null,customerName:t.supplierName,customerNif:t.supplierNif,lines:(t.lines||[]).map(i=>({description:i.description||i.productName||"-",quantity:i.quantity,unitPrice:i.unitPrice,totalHT:i.quantity*i.unitPrice,discountPercent:0})),totalHT:t.totalHT,totalTVA:t.totalTVA,totalTTC:t.totalTTC,taxRate:t.taxRate,status:t.status,notes:t.notes})}printLowStock(t){let i=e=>{let l=e?.currency==="TND"?"DT":e?.currency||"DT",r=new Date().toLocaleDateString("fr-FR"),d=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),m=(e?.companyName||"NEW-BAT HARZALLAH").toUpperCase(),f=[e?.address?`<div class="company-info">${e.address}</div>`:"",e?.nif?`<div class="company-info">MF : ${e.nif}</div>`:"",e?.phone?`<div class="company-info">GSM : ${e.phone}</div>`:"",e?.rib?`<div class="company-info">RIB : ${e.rib}</div>`:""].join(""),h=t.map(a=>`
        <div class="item-row">
          <span class="item-desc"><code>${a.reference}</code> \u2014 ${a.name}<br>
            <small>${a.categoryName||""}</small>
          </span>
          <span class="item-stock">
            <span class="stock-val">${a.stockQuantity} ${a.unit||""}</span><br>
            <small>Seuil: ${a.alertThreshold}</small>
          </span>
        </div>
        <hr class="d">`).join(""),b=`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rcpt { font-family: 'Courier New', Courier, monospace; background: #fff; color: #000;
                width: ${this.W_PX}px; padding: 0 8px; font-size: 11px; line-height: 1.5; }
        .company-name { text-align: center; font-size: 20px; font-weight: 900; letter-spacing: .04em; line-height: 1.15; margin-bottom: 2px; }
        .company-deco { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 3px; }
        .company-info { text-align: center; font-size: 9px; margin-bottom: 4px; }
        hr.d  { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        hr.s  { border: none; border-top: 1px solid #000; margin: 4px 0; }
        hr.eq { border: none; border-top: 3px double #000; margin: 5px 0; }
        .doc-title { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: .06em; margin: 6px 0 4px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; font-size: 10px; gap: 2px 4px; margin: 3px 0; }
        .meta-grid .r { text-align: right; }
        .col-hdr { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold;
                   text-transform: uppercase; padding: 2px 0; border-bottom: 1px solid #000; margin-bottom: 2px; }
        .item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 3px 0; font-size: 10.5px; }
        .item-desc { flex: 1; word-break: break-word; padding-right: 4px; }
        .item-desc small { font-size: 9px; color: #444; }
        .item-desc code { font-size: 9.5px; }
        .item-stock { text-align: right; white-space: nowrap; }
        .stock-val { font-weight: 900; color: #c00; }
        .item-stock small { font-size: 9px; color: #555; }
        .summary { font-size: 10px; text-align: right; margin-top: 4px; }
        .footer { text-align: center; font-size: 10px; margin-top: 6px; line-height: 1.7; }
        .footer .tagline { font-size: 11px; font-weight: bold; letter-spacing: .04em; }
      `,g=`
        <div class="company-name">${m}</div>
        <div class="company-deco">* ================ *</div>
        ${f}
        <hr class="d">
        <div class="doc-title">\u26A0 ALERTES STOCK FAIBLE</div>
        <div class="meta-grid">
          <span>Date : ${r}</span><span class="r">Heure : ${d}</span>
        </div>
        <hr class="d">
        <div class="col-hdr"><span>Produit</span><span>Stock / Seuil</span></div>
        ${h}
        <div class="summary">${t.length} produit(s) en alerte</div>
        <hr class="eq">
        <div class="footer">
          <em>V\xE9rifiez vos approvisionnements</em><br>
          <span class="tagline">* ${e?.companyName||"NEW-BAT HARZALLAH"} *</span>
        </div>`,s=document.createElement("div");s.style.cssText=`position:fixed;left:-9999px;top:0;width:${this.W_PX}px;background:#fff;`,s.innerHTML=`<style>${b}</style><div class="rcpt">${g}</div>`,document.body.appendChild(s),import("./chunk-G5RWJARE.js").then(({default:a})=>import("./chunk-EIQ4AR3Q.js").then(({default:o})=>{a(s,{scale:2,backgroundColor:"#ffffff",useCORS:!0,width:this.W_PX,windowWidth:this.W_PX}).then(n=>{let p=Math.ceil(n.height/n.width*72*100)/100,x=new o({unit:"mm",format:[72,p],orientation:"portrait"});x.addImage(n.toDataURL("image/jpeg",.97),"JPEG",0,0,72,p),x.save(`ALERTES-STOCK-FAIBLE-${r.replace(/\//g,"-")}.pdf`)}).finally(()=>document.body.removeChild(s))}))};this.settings?i(this.settings):this.api.getCompanySettings().subscribe({next:e=>{this.settings=e,this.currency=e.currency||"TND",i(e)},error:()=>{this.settings={},i({})}})}printCloture(t){let i=e=>{let l=e?.currency==="TND"?"DT":e?.currency||"DT",r=n=>n.toFixed(3),d=(e?.companyName||"NEW-BAT HARZALLAH").toUpperCase(),m=new Date().toLocaleDateString("fr-FR"),f=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),h=this.auth.getUser()?.fullName||"",b=[e?.address?`<div class="company-info">${e.address}</div>`:"",e?.nif?`<div class="company-info">MF : ${e.nif}</div>`:"",e?.phone?`<div class="company-info">T\xE9l : ${e.phone}</div>`:""].join(""),g=t.bls.map(n=>{let u={DRAFT:"Brouillon",SENT:"Envoy\xE9",PAID:"Pay\xE9",CANCELLED:"Annul\xE9"};return`
          <div class="item-row">
            <span class="item-desc">
              <strong>${n.number||"\u2014"}</strong><br>
              <strong class="client-name">${n.customerName||"\u2014"}</strong>
            </span>
            <span class="item-right">
              <span class="item-price">${r(n.totalTTC||0)} ${l}</span><br>
              <span class="item-status">${u[n.status]||n.status||""}</span>
            </span>
          </div>
          <hr class="d">`}).join(""),s=`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rcpt { font-family: 'Courier New', Courier, monospace; background: #fff; color: #000;
                width: ${this.W_PX}px; padding: 0 8px; font-size: 11px; line-height: 1.5; }
        .company-name { text-align: center; font-size: 20px; font-weight: 900; letter-spacing: .04em; line-height: 1.15; margin-bottom: 2px; }
        .company-deco { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 3px; }
        .company-info { display: block; text-align: center; font-size: 9px; margin: 0 0 3px 0; line-height: 1.6; }
        hr.d  { border: none; border-top: 1px dashed #000; margin: 5px 0; }
        hr.s  { border: none; border-top: 1px solid #000; margin: 4px 0; }
        hr.eq { border: none; border-top: 3px double #000; margin: 5px 0; }
        .doc-title { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: .08em; margin: 6px 0 4px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; font-size: 10px; gap: 2px 4px; margin: 3px 0; }
        .meta-grid .r { text-align: right; }
        .meta-full { display: block; font-size: 10px; margin: 2px 0; }
        .col-hdr { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold;
                   text-transform: uppercase; padding: 2px 0; border-bottom: 1px solid #000; margin-bottom: 2px; }
        .item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 3px 0; font-size: 10.5px; }
        .item-desc { flex: 1; word-break: break-word; padding-right: 4px; }
        .client-name { font-size: 9.5px; color: #333; }
        .item-right { text-align: right; white-space: nowrap; }
        .item-price { font-weight: bold; }
        .item-status { font-size: 9px; color: #555; }
        .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; padding: 4px 0; }
        .count-row { font-size: 10px; text-align: right; margin-bottom: 2px; }
        .footer { text-align: center; font-size: 10px; margin-top: 6px; line-height: 1.7; }
        .footer .tagline { font-size: 11px; font-weight: bold; letter-spacing: .04em; }
        .amount-words { font-size: 9px; font-style: italic; text-align: center; border: 1px solid #000; padding: 3px 4px; margin: 3px 0; word-break: break-word; }
      `,a=`
        <div class="company-name">${d}</div>
        <div class="company-deco">* ================ *</div>
        ${b}
        <hr class="d">
        <div class="doc-title">CL\xD4TURE DE JOUR</div>
        <div class="meta-grid">
          <span>Jour : ${t.dateLabel}</span>
          <span></span>
          <span>Imprim\xE9 : ${m}</span><span class="r">Heure : ${f}</span>
        </div>
        ${h?`<div class="meta-full">Vendeur : <strong>${h}</strong></div>`:""}
        <hr class="d">
        <div class="col-hdr"><span>BL / Client</span><span>Montant</span></div>
        ${g}
        <div class="count-row">${t.count} bon(s) de livraison</div>
        <hr class="s">
        <div class="total-row"><span>TOTAL JOUR</span><span>${r(t.totalTTC)} ${l}</span></div>
        <div class="amount-words">${this.capitalize(this.numberToWords(t.totalTTC,l))}</div>
        <hr class="eq">
        <div class="footer">
          <em>Cl\xF4ture journali\xE8re</em><br>
          <span class="tagline">* ${e?.companyName||"NEW-BAT HARZALLAH"} *</span>
        </div>`,o=document.createElement("div");o.style.cssText=`position:fixed;left:-9999px;top:0;width:${this.W_PX}px;background:#fff;`,o.innerHTML=`<style>${s}</style><div class="rcpt">${a}</div>`,document.body.appendChild(o),import("./chunk-G5RWJARE.js").then(({default:n})=>import("./chunk-EIQ4AR3Q.js").then(({default:u})=>{n(o,{scale:2,backgroundColor:"#ffffff",useCORS:!0,width:this.W_PX,windowWidth:this.W_PX}).then(p=>{let T=Math.ceil(p.height/p.width*72*100)/100,v=new u({unit:"mm",format:[72,T],orientation:"portrait"});v.addImage(p.toDataURL("image/jpeg",.97),"JPEG",0,0,72,T),v.save(`CLOTURE-${t.date}.pdf`)}).finally(()=>document.body.removeChild(o))}))};this.settings?i(this.settings):this.api.getCompanySettings().subscribe({next:e=>{this.settings=e,this.currency=e.currency||"TND",i(e)},error:()=>{this.settings={},i({})}})}printMovement(t){this.print({type:"BON_SORTIE",number:t.reference||"MVT-"+t.id,date:t.date,dueDate:null,customerName:null,lines:[{description:t.productName||"-",quantity:t.quantity,unitPrice:0,totalHT:0,discountPercent:0}],totalHT:0,totalTVA:0,totalTTC:0,taxRate:0,status:"DRAFT",notes:t.notes})}fmt(t){return t.toFixed(3)}numberToWords(t,i){let e=["","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"],l=["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"],r=s=>{if(s<20)return e[s];let a=Math.floor(s/10),o=s%10;return a===7?"soixante-"+e[10+o]:a===9?o===0?"quatre-vingt-dix":"quatre-vingt-"+e[10+o]:a===8?o===0?"quatre-vingts":"quatre-vingt-"+e[o]:l[a]+(o===1?"-et-un":o>0?"-"+e[o]:"")},d=s=>{if(s<100)return r(s);let a=Math.floor(s/100),o=s%100,n=a===1?"cent":e[a]+" cent"+(o===0&&a>1?"s":"");return o===0?n:n+" "+r(o)},m=s=>{if(s===0)return"z\xE9ro";if(s<1e3)return d(s);if(s<1e6){let u=Math.floor(s/1e3),p=s%1e3,x=u===1?"mille":d(u)+" mille";return p===0?x:x+" "+d(p)}let a=Math.floor(s/1e6),o=s%1e6,n=a===1?"un million":m(a)+" millions";return o===0?n:n+" "+m(o)},f=Math.floor(t),h=Math.round((t-f)*1e3),b=i==="DT"||i==="TND"?f>1?"dinars":"dinar":i,g=m(f)+" "+b;return h>0&&(g+=" et "+m(h)+(h>1?" millimes":" millime")),g}capitalize(t){return t&&t.charAt(0).toUpperCase()+t.slice(1)}doPrintA4(t){return E(this,null,function*(){let i=this.settings||{},e=this.currency,l=t.type==="FACTURE"?"FACTURE":t.type==="DEVIS"||t.type==="BON_SORTIE"?"DEVIS":t.type==="BON_COMMANDE"?"BON DE COMMANDE":"BON DE LIVRAISON",r=t.type==="BON_SORTIE"&&!t.customerName,d=t.type==="BON_SORTIE"||t.type==="DEVIS"&&!!t.supplierName,m=t.type==="BON_LIVRAISON",f=t.type==="BON_COMMANDE"||d?"Fournisseur":"Client",h=t.status==="SENT",b=d?t.supplierName||"-":t.customerName||"-",g=d?t.supplierAddress:t.customerAddress,s=d?null:t.customerNif,a=new Date(t.date).toLocaleDateString("fr-FR"),o=(i.companyName||"NEW-BAT HARZALLAH").toUpperCase(),n=(t.lines||[]).map(c=>{let $=c.discountPercent>0?` <span class="disc">(-${c.discountPercent}%)</span>`:"";return r?`<tr><td>${c.description||"-"}</td><td class="col-num">${c.quantity}</td></tr>`:`<tr>
        <td>${c.description||"-"}${$}</td>
        <td class="col-num">${c.quantity}</td>
        <td class="col-center">${c.dimension||""}</td>
        <td class="col-num">${this.fmt(c.unitPrice||0)}</td>
        <td class="col-num">${this.fmt(c.totalHT||0)}</td>
      </tr>`}).join(""),u=r?'<tr><th style="width:80%">D\xE9signation</th><th class="col-num" style="width:20%">QTE</th></tr>':`<tr>
          <th style="width:37%">D\xE9signation</th>
          <th class="col-num" style="width:9%">QTE</th>
          <th class="col-center" style="width:16%">DIM</th>
          <th class="col-num" style="width:19%">P.unitaire</th>
          <th class="col-num" style="width:19%">P.total</th>
        </tr>`,p=!r&&(t.taxRate||0)>0,x=!r&&(t.globalDiscount||0)>0,T=t.type==="FACTURE"?"la pr\xE9sente facture":t.type==="BON_LIVRAISON"?"le pr\xE9sent bon de livraison":t.type==="BON_COMMANDE"?"le pr\xE9sent bon de commande":"le pr\xE9sent devis",v=r?"":`
      <div class="a4-totals">
        <div class="row"><span>Total HT</span><span>${this.fmt(t.totalHT||0)} ${e}</span></div>
        ${x?`<div class="row"><span>Remise (${t.globalDiscount}%)</span><span>- ${this.fmt((t.totalHT||0)*(t.globalDiscount||0)/100)} ${e}</span></div>`:""}
        ${p?`<div class="row"><span>TVA (${t.taxRate}%)</span><span>${this.fmt(t.totalTVA||0)} ${e}</span></div>`:""}
        <div class="row"><span>Timbre fiscal</span><span>${this.fmt(t.stampDuty||0)} ${e}</span></div>
        <div class="row grand"><span>TOTAL TTC</span><span>${this.fmt(t.totalTTC||0)} ${e}</span></div>
      </div>
      <div class="a4-words">Arr\xEAt\xE9 ${T} \xE0 la somme de ${this.numberToWords(t.totalTTC||0,e)}.</div>`,k=`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .a4 { font-family: Calibri, Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a;
            width: ${this.A4_W_PX}px; padding: 55px 60px; font-size: 13px; line-height: 1.5; overflow: hidden; }
      .a4-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #1a3a8f; }
      .a4-company { font-family: 'Times New Roman', Times, serif; color: #1a3a8f; line-height: 1.7;
                    flex: 0 1 380px; max-width: 380px; }
      .a4-company-name { font-size: 15px; font-weight: 700; }
      .a4-company-sub { font-size: 11.5px; font-style: italic; }
      .a4-company-line { font-size: 12.5px; font-weight: 700; }
      .a4-right-col { text-align: right; flex: 0 1 260px; max-width: 260px; }
      .a4-logo { max-width: 220px; max-height: 170px; object-fit: contain; margin-left: auto; margin-bottom: 10px; }
      .a4-party { font-size: 12px; line-height: 1.8; word-wrap: break-word; }

      .a4-doc-title { font-size: 20px; font-weight: 700; color: #1a3a8f; margin: 14px 0 18px; }

      table.a4-lines { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 14px; font-size: 12.5px; border-top: 2px solid #1a3a8f; }
      table.a4-lines thead { background: #ebf0ff; }
      table.a4-lines th { text-align: left; padding: 6px 8px 6px 4px; font-weight: 700; color: #1a3a8f; border-bottom: 2px solid #1a3a8f; }
      table.a4-lines td { padding: 5px 8px 5px 4px; vertical-align: top; overflow-wrap: break-word; border-bottom: 1px solid #e8ecf4; }
      table.a4-lines tbody tr:last-child td { border-bottom: none; }
      table.a4-lines .col-num { text-align: right; }
      table.a4-lines .col-center { text-align: center; }
      .disc { color: #b00; font-size: 11px; }

      .a4-totals { margin-left: auto; width: 280px; margin-top: 14px; }
      .a4-totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12.5px; border-bottom: 1px solid #e8ecf4; }
      .a4-totals .row:last-child { border-bottom: none; }
      .a4-totals .grand { font-weight: 700; color: #1a3a8f; border-top: 2px solid #1a3a8f; border-bottom: none; padding-top: 8px; }

      .a4-words { font-size: 12.5px; font-style: italic; margin: 14px 0; }

      .a4-extra { font-size: 12.5px; margin: 14px 0; }
      .a4-notes { font-size: 12px; color: #333; margin: 14px 0; }

      .a4-unpaid { display: inline-block; font-size: 12px; font-weight: 700; color: #c00;
                   border: 1px solid #c00; padding: 3px 10px; margin: 10px 0; text-transform: uppercase; }
    `,W=`
      <div class="a4-header">
        <div class="a4-company">
          <div class="a4-company-name">${o}</div>
          <div class="a4-company-sub">${i.address||""}</div>
          ${i.nif?`<div class="a4-company-line">MF : ${i.nif}</div>`:""}
          ${i.rib?`<div class="a4-company-line">RIB : ${i.rib}</div>`:""}
          ${i.phone?`<div class="a4-company-line">GSM : ${i.phone}</div>`:""}
        </div>
        <div class="a4-right-col">
          ${i.logo?`<img class="a4-logo" src="${i.logo}" />`:""}
          <div>Date : ${a}</div>
          ${t.dueDate?`<div>\xC9ch\xE9ance : ${new Date(t.dueDate).toLocaleDateString("fr-FR")}</div>`:""}
          ${r?"":`
          <div class="a4-party">
            <div>${f} : ${b}</div>
            ${s?`<div>Mat. Fiscal : ${s}</div>`:""}
            ${g?`<div>Adresse : ${g}</div>`:""}
          </div>`}
        </div>
      </div>

      <div class="a4-doc-title">${l} : ${t.number||""}</div>

      <table class="a4-lines">
        <thead>${u}</thead>
        <tbody>${n}</tbody>
      </table>

      ${v}

      ${m&&(t.driverName||t.truckPlate)?`
      <div class="a4-extra">
        ${t.driverName?`Nom de chauffeur : ${t.driverName}<br>`:""}
        ${t.truckPlate?`S\xE9rie de camion : ${t.truckPlate}`:""}
      </div>`:""}

      ${t.notes?`<div class="a4-notes">Notes : ${t.notes}</div>`:""}

`,w=document.createElement("iframe");w.style.cssText=`position:fixed;left:-9999px;top:0;width:${this.A4_W_PX}px;height:100px;border:0;`,document.body.appendChild(w);try{let c=w.contentDocument;c.open(),c.write(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;}${k}</style></head><body><div class="a4">${W}</div></body></html>`),c.close(),yield new Promise(M=>setTimeout(M,200));let $=c.querySelector(".a4"),z=$.scrollWidth,N=$.scrollHeight;w.style.height=N+"px";let A=yield(0,O.default)($,{scale:2,backgroundColor:"#ffffff",useCORS:!0,width:z,height:N,windowWidth:z,windowHeight:N}),D=210,S=Math.ceil(A.height/A.width*D*100)/100,R=new I({unit:"mm",format:[D,S],orientation:"portrait"});R.addImage(A.toDataURL("image/jpeg",.97),"JPEG",0,0,D,S),R.save(`${l}-${t.number||"document"}.pdf`)}finally{document.body.removeChild(w)}})}static{this.\u0275fac=function(i){return new(i||y)(C(H),C(L))}}static{this.\u0275prov=P({token:y,factory:y.\u0275fac,providedIn:"root"})}}return y})();export{j as a};
