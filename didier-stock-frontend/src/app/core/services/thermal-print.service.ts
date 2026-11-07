import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({ providedIn: 'root' })
export class ThermalPrintService {
  private settings: any = null;
  private currency = 'DT';
  private readonly W_PX = 272; // 72mm at 96 dpi (thermal ticket, used by internal reports)
  private readonly A4_W_PX = 794; // 210mm at 96 dpi (A4 documents: facture / devis / bon de livraison)

  constructor(private api: ApiService, private auth: AuthService) {}

  loadSettings(s: any) {
    this.settings = s;
    this.currency = s?.currency === 'TND' ? 'DT' : (s?.currency || 'DT');
  }

  print(inv: any) {
    // Real Invoice records (Facture / Bon de Sortie / Bon de Livraison) are rendered
    // server-side with PDFBox — deterministic output, no browser CSS involved. Synthetic
    // print payloads (purchase orders, stock movements) don't have a real invoice id and
    // keep using the client-side renderer below.
    const realInvoiceTypes = ['FACTURE', 'DEVIS', 'BON_LIVRAISON'];
    if (inv?.id && realInvoiceTypes.includes(inv.type)) {
      this.printServerPdf(inv);
      return;
    }
    if (this.settings) {
      this.doPrintA4(inv);
    } else {
      this.api.getCompanySettings().subscribe({
        next: s => { this.settings = s; this.currency = s.currency || 'TND'; this.doPrintA4(inv); },
        error: () => { this.settings = {}; this.doPrintA4(inv); }
      });
    }
  }

  private printServerPdf(inv: any) {
    const pdf$ = this.auth.getToken() ? this.api.getInvoicePdf(inv.id) : this.api.getPublicInvoicePdf(inv.id);
    pdf$.subscribe({
      next: blob => {
        const typeLabel = inv.type === 'FACTURE' ? 'FACTURE' : inv.type === 'DEVIS' ? 'DEVIS' : 'BON_LIVRAISON';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${typeLabel}-${inv.number || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        // Fall back to the client-side renderer if the server endpoint is unreachable.
        if (this.settings) {
          this.doPrintA4(inv);
        } else {
          this.api.getCompanySettings().subscribe({
            next: s => { this.settings = s; this.currency = s.currency || 'TND'; this.doPrintA4(inv); },
            error: () => { this.settings = {}; this.doPrintA4(inv); }
          });
        }
      }
    });
  }

  printPurchaseOrder(order: any) {
    this.print({
      type: 'BON_COMMANDE',
      number: order.number,
      date: order.date,
      dueDate: null,
      customerName: order.supplierName,
      customerNif: order.supplierNif,
      lines: (order.lines || []).map((l: any) => ({
        description: l.description || l.productName || '-',
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalHT: l.quantity * l.unitPrice,
        discountPercent: 0
      })),
      totalHT: order.totalHT,
      totalTVA: order.totalTVA,
      totalTTC: order.totalTTC,
      taxRate: order.taxRate,
      status: order.status,
      notes: order.notes
    });
  }

  printLowStock(products: any[]) {
    const doIt = (co: any) => {
      const cur = co?.currency === 'TND' ? 'DT' : (co?.currency || 'DT');
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const companyName = (co?.companyName || 'NEW-BAT HARZALLAH').toUpperCase();
      const companyInfoHtml = [
        co?.address ? `<div class="company-info">${co.address}</div>`     : '',
        co?.nif     ? `<div class="company-info">MF : ${co.nif}</div>`   : '',
        co?.phone   ? `<div class="company-info">GSM : ${co.phone}</div>` : '',
        co?.rib     ? `<div class="company-info">RIB : ${co.rib}</div>` : '',
      ].join('');

      const rowsHtml = products.map(p => `
        <div class="item-row">
          <span class="item-desc"><code>${p.reference}</code> — ${p.name}<br>
            <small>${p.categoryName || ''}</small>
          </span>
          <span class="item-stock">
            <span class="stock-val">${p.stockQuantity} ${p.unit || ''}</span><br>
            <small>Seuil: ${p.alertThreshold}</small>
          </span>
        </div>
        <hr class="d">`).join('');

      const css = `
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
      `;

      const bodyHtml = `
        <div class="company-name">${companyName}</div>
        <div class="company-deco">* ================ *</div>
        ${companyInfoHtml}
        <hr class="d">
        <div class="doc-title">⚠ ALERTES STOCK FAIBLE</div>
        <div class="meta-grid">
          <span>Date : ${dateStr}</span><span class="r">Heure : ${timeStr}</span>
        </div>
        <hr class="d">
        <div class="col-hdr"><span>Produit</span><span>Stock / Seuil</span></div>
        ${rowsHtml}
        <div class="summary">${products.length} produit(s) en alerte</div>
        <hr class="eq">
        <div class="footer">
          <em>Vérifiez vos approvisionnements</em><br>
          <span class="tagline">* ${co?.companyName || 'NEW-BAT HARZALLAH'} *</span>
        </div>`;

      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:${this.W_PX}px;background:#fff;`;
      container.innerHTML = `<style>${css}</style><div class="rcpt">${bodyHtml}</div>`;
      document.body.appendChild(container);

      import('html2canvas').then(({ default: html2canvas }) =>
        import('jspdf').then(({ default: jsPDF }) => {
          html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: this.W_PX, windowWidth: this.W_PX })
            .then(canvas => {
              const pdfW = 72;
              const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW * 100) / 100;
              const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH], orientation: 'portrait' });
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pdfW, pdfH);
              pdf.save(`ALERTES-STOCK-FAIBLE-${dateStr.replace(/\//g, '-')}.pdf`);
            })
            .finally(() => document.body.removeChild(container));
        })
      );
    };

    if (this.settings) {
      doIt(this.settings);
    } else {
      this.api.getCompanySettings().subscribe({
        next: s => { this.settings = s; this.currency = s.currency || 'TND'; doIt(s); },
        error: () => { this.settings = {}; doIt({}); }
      });
    }
  }

  printCloture(jour: { date: string; dateLabel: string; bls: any[]; totalTTC: number; count: number }) {
    const doIt = (co: any) => {
      const cur = co?.currency === 'TND' ? 'DT' : (co?.currency || 'DT');
      const fmt = (n: number) => n.toFixed(3);
      const companyName = (co?.companyName || 'NEW-BAT HARZALLAH').toUpperCase();
      const printDate = new Date().toLocaleDateString('fr-FR');
      const printTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const vendeur = this.auth.getUser()?.fullName || '';

      const companyInfoHtml = [
        co?.address ? `<div class="company-info">${co.address}</div>` : '',
        co?.nif     ? `<div class="company-info">MF : ${co.nif}</div>` : '',
        co?.phone   ? `<div class="company-info">Tél : ${co.phone}</div>` : '',
      ].join('');

      const rowsHtml = jour.bls.map(bl => {
        const statusLabel: any = { DRAFT: 'Brouillon', SENT: 'Envoyé', PAID: 'Payé', CANCELLED: 'Annulé' };
        return `
          <div class="item-row">
            <span class="item-desc">
              <strong>${bl.number || '—'}</strong><br>
              <strong class="client-name">${bl.customerName || '—'}</strong>
            </span>
            <span class="item-right">
              <span class="item-price">${fmt(bl.totalTTC || 0)} ${cur}</span><br>
              <span class="item-status">${statusLabel[bl.status] || bl.status || ''}</span>
            </span>
          </div>
          <hr class="d">`;
      }).join('');

      const css = `
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
      `;

      const bodyHtml = `
        <div class="company-name">${companyName}</div>
        <div class="company-deco">* ================ *</div>
        ${companyInfoHtml}
        <hr class="d">
        <div class="doc-title">CLÔTURE DE JOUR</div>
        <div class="meta-grid">
          <span>Jour : ${jour.dateLabel}</span>
          <span></span>
          <span>Imprimé : ${printDate}</span><span class="r">Heure : ${printTime}</span>
        </div>
        ${vendeur ? `<div class="meta-full">Vendeur : <strong>${vendeur}</strong></div>` : ''}
        <hr class="d">
        <div class="col-hdr"><span>BL / Client</span><span>Montant</span></div>
        ${rowsHtml}
        <div class="count-row">${jour.count} bon(s) de livraison</div>
        <hr class="s">
        <div class="total-row"><span>TOTAL JOUR</span><span>${fmt(jour.totalTTC)} ${cur}</span></div>
        <div class="amount-words">${this.capitalize(this.numberToWords(jour.totalTTC, cur))}</div>
        <hr class="eq">
        <div class="footer">
          <em>Clôture journalière</em><br>
          <span class="tagline">* ${co?.companyName || 'NEW-BAT HARZALLAH'} *</span>
        </div>`;

      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:${this.W_PX}px;background:#fff;`;
      container.innerHTML = `<style>${css}</style><div class="rcpt">${bodyHtml}</div>`;
      document.body.appendChild(container);

      import('html2canvas').then(({ default: html2canvas }) =>
        import('jspdf').then(({ default: jsPDF }) => {
          html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: this.W_PX, windowWidth: this.W_PX })
            .then(canvas => {
              const pdfW = 72;
              const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW * 100) / 100;
              const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH], orientation: 'portrait' });
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pdfW, pdfH);
              pdf.save(`CLOTURE-${jour.date}.pdf`);
            })
            .finally(() => document.body.removeChild(container));
        })
      );
    };

    if (this.settings) {
      doIt(this.settings);
    } else {
      this.api.getCompanySettings().subscribe({
        next: s => { this.settings = s; this.currency = s.currency || 'TND'; doIt(s); },
        error: () => { this.settings = {}; doIt({}); }
      });
    }
  }

  printMovement(movement: any) {
    this.print({
      type: 'BON_SORTIE',
      number: movement.reference || ('MVT-' + movement.id),
      date: movement.date,
      dueDate: null,
      customerName: null,
      lines: [{ description: movement.productName || '-', quantity: movement.quantity, unitPrice: 0, totalHT: 0, discountPercent: 0 }],
      totalHT: 0, totalTVA: 0, totalTTC: 0, taxRate: 0, status: 'DRAFT', notes: movement.notes
    });
  }

  private fmt(n: number): string { return n.toFixed(3); }

  private numberToWords(amount: number, currency: string): string {
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
      'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    const belowHundred = (n: number): string => {
      if (n < 20) return ones[n];
      const t = Math.floor(n / 10);
      const o = n % 10;
      if (t === 7) return 'soixante-' + ones[10 + o];
      if (t === 9) return o === 0 ? 'quatre-vingt-dix' : 'quatre-vingt-' + ones[10 + o];
      if (t === 8) return o === 0 ? 'quatre-vingts' : 'quatre-vingt-' + ones[o];
      return tens[t] + (o === 1 ? '-et-un' : o > 0 ? '-' + ones[o] : '');
    };

    const belowThousand = (n: number): string => {
      if (n < 100) return belowHundred(n);
      const h = Math.floor(n / 100);
      const r = n % 100;
      const hStr = h === 1 ? 'cent' : ones[h] + ' cent' + (r === 0 && h > 1 ? 's' : '');
      return r === 0 ? hStr : hStr + ' ' + belowHundred(r);
    };

    const convert = (n: number): string => {
      if (n === 0) return 'zéro';
      if (n < 1000) return belowThousand(n);
      if (n < 1000000) {
        const th = Math.floor(n / 1000);
        const r = n % 1000;
        const thStr = th === 1 ? 'mille' : belowThousand(th) + ' mille';
        return r === 0 ? thStr : thStr + ' ' + belowThousand(r);
      }
      const m = Math.floor(n / 1000000);
      const r = n % 1000000;
      const mStr = m === 1 ? 'un million' : convert(m) + ' millions';
      return r === 0 ? mStr : mStr + ' ' + convert(r);
    };

    const intPart = Math.floor(amount);
    const decPart = Math.round((amount - intPart) * 1000);
    const currWord = (currency === 'DT' || currency === 'TND')
      ? (intPart > 1 ? 'dinars' : 'dinar')
      : currency;
    let result = convert(intPart) + ' ' + currWord;
    if (decPart > 0) {
      result += ' et ' + convert(decPart) + (decPart > 1 ? ' millimes' : ' millime');
    }
    return result;
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  private async doPrintA4(inv: any): Promise<void> {
    const co   = this.settings || {};
    const cur  = this.currency;
    const f3   = (n: any) => Number(n || 0).toFixed(3);

    const typeLabel =
      inv.type === 'FACTURE'       ? 'FACTURE' :
      inv.type === 'DEVIS'         ? 'DEVIS' :
      inv.type === 'BON_SORTIE'    ? 'DEVIS' :
      inv.type === 'BON_COMMANDE'  ? 'BON DE COMMANDE' :
                                     'BON DE LIVRAISON';

    const docWord =
      inv.type === 'FACTURE'       ? 'la présente facture' :
      inv.type === 'BON_LIVRAISON' ? 'le présent bon de livraison' :
      inv.type === 'BON_COMMANDE'  ? 'le présent bon de commande' :
                                     'le présent devis';

    const isMvt          = inv.type === 'BON_SORTIE' && !inv.customerName;
    const isBonSortie    = inv.type === 'BON_SORTIE' || (inv.type === 'DEVIS' && !!inv.supplierName);
    const isBonLivraison = inv.type === 'BON_LIVRAISON';
    const clientLabel    = (inv.type === 'BON_COMMANDE' || isBonSortie) ? 'Fournisseur' : 'Client';
    const partyName      = isBonSortie ? (inv.supplierName    || '-') : (inv.customerName    || '-');
    const partyAddress   = isBonSortie ?  inv.supplierAddress         :  inv.customerAddress;
    const partyNif       = isBonSortie ?  null                        :  inv.customerNif;

    const dateStr     = new Date(inv.date).toLocaleDateString('fr-FR');
    const companyName = (co.companyName || 'Mon Entreprise').toUpperCase();

    const showTVA      = !isMvt && (inv.taxRate      || 0) > 0;
    const showDiscount = !isMvt && (inv.globalDiscount || 0) > 0;
    const amountWords  = this.capitalize(this.numberToWords(inv.totalTTC || 0, cur));

    // ── Tableau produits ──────────────────────────────────────
    const thHtml = isMvt
      ? `<tr><th style="width:80%">Désignation</th><th class="r" style="width:20%">QTE</th></tr>`
      : `<tr>
           <th style="width:37%">Désignation</th>
           <th class="r" style="width:9%">QTE</th>
           <th class="c" style="width:16%">DIM</th>
           <th class="r" style="width:19%">P.unitaire</th>
           <th class="r" style="width:19%">P.total</th>
         </tr>`;

    const tdHtml = (inv.lines || []).map((l: any) => {
      const disc = l.discountPercent > 0 ? ` <span class="disc">(-${l.discountPercent}%)</span>` : '';
      if (isMvt) {
        return `<tr><td>${l.description || '-'}</td><td class="r">${l.quantity}</td></tr>`;
      }
      return `<tr>
        <td>${l.description || '-'}${disc}</td>
        <td class="r">${l.quantity}</td>
        <td class="c">${l.dimension || ''}</td>
        <td class="r">${f3(l.unitPrice)}</td>
        <td class="r">${f3(l.totalHT)}</td>
      </tr>`;
    }).join('');

    // ── Totaux ────────────────────────────────────────────────
    const totHtml = isMvt ? '' : `
      <div class="tot-wrap">
        <div class="tots">
          <div class="tot"><span>Total HT</span><span>${f3(inv.totalHT)} ${cur}</span></div>
          ${showDiscount ? `<div class="tot"><span>Remise (${inv.globalDiscount}%)</span><span>- ${f3((inv.totalHT||0)*(inv.globalDiscount||0)/100)} ${cur}</span></div>` : ''}
          ${showTVA      ? `<div class="tot"><span>TVA (${inv.taxRate}%)</span><span>${f3(inv.totalTVA)} ${cur}</span></div>` : ''}
          <div class="tot"><span>Timbre fiscal</span><span>${f3(inv.stampDuty)} ${cur}</span></div>
          <div class="tot grand"><span>TOTAL TTC</span><span>${f3(inv.totalTTC)} ${cur}</span></div>
        </div>
      </div>`;

    // ── CSS — layout identique au PDF Java ────────────────────
    const W = this.A4_W_PX;
    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { margin: 0; padding: 0; width: ${W}px; }

      .a4 {
        font-family: Arial, Helvetica, sans-serif;
        background: #fff; color: #000;
        width: ${W}px; padding: 36px 38px;
        font-size: 11px; line-height: 1.4;
      }

      /* ── HEADER 2×2 (table HTML pour fiabilité html2canvas) ── */
      .hdr { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .hdr td { border: 0.6px solid #000; padding: 8px 10px; vertical-align: top; }
      .hdr-logo { width: 54%; }
      .hdr-logo img { max-width: 210px; max-height: 90px; object-fit: contain; display: block; }
      .hdr-doctype { width: 46%; text-align: right; vertical-align: middle; }
      .hdr-doctype-title { font-size: 17px; font-weight: 900; color: #1a3a8f; }
      .hdr-doctype-line  { font-size: 10.5px; margin-top: 4px; }
      .hdr-co { font-family: 'Times New Roman', Times, serif; color: #1a3a8f; }
      .hdr-co-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
      .hdr-co-sub  { font-size: 9.5px; font-style: italic; }
      .hdr-co-line { font-size: 10px; font-weight: 700; margin-top: 3px; }
      .hdr-cl-label { font-size: 10px; font-weight: 700; color: #1a3a8f; margin-bottom: 4px; }
      .hdr-cl-name  { font-size: 11px; font-weight: 700; margin-bottom: 3px; }
      .hdr-cl-line  { font-size: 10px; margin-top: 2px; }

      /* ── TABLE PRODUITS ── */
      table.tbl { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 11.5px; margin-bottom: 10px; border-top: 2px solid #1a3a8f; }
      table.tbl thead { background: #ebf0ff; }
      table.tbl th { font-weight: 700; color: #1a3a8f; padding: 6px 4px; border-bottom: 2px solid #1a3a8f; text-align: left; }
      table.tbl th.r { text-align: right; }
      table.tbl th.c { text-align: center; }
      table.tbl td { padding: 5px 4px; vertical-align: top; border-bottom: 1px solid #d2dcf0; overflow-wrap: break-word; word-break: break-word; }
      table.tbl td.r { text-align: right; }
      table.tbl td.c { text-align: center; }
      table.tbl tbody tr:last-child td { border-bottom: none; }
      .disc { color: #b00; font-size: 10px; }

      /* ── TOTAUX (colonne droite) ── */
      .tot-wrap { display: flex; justify-content: flex-end; margin-top: 14px; }
      .tots { width: 265px; }
      .tot { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11.5px; border-bottom: 1px solid #e8ecf4; }
      .tot:last-child { border-bottom: none; }
      .tot.grand { font-weight: 700; border-top: 2px solid #000; border-bottom: none; padding-top: 7px; margin-top: 2px; }

      /* ── MONTANT EN LETTRES ── */
      .words { font-size: 11px; font-style: italic; margin: 12px 0 0; }

      /* ── NOTES / EXTRA ── */
      .notes { font-size: 11px; color: #333; margin: 12px 0; }
      .extra { font-size: 11.5px; margin: 12px 0; }

      /* ── SIGNATURE ── */
      .sig { text-align: right; margin-top: 28px; font-size: 10.5px; font-weight: 700; color: #000; }
    `;

    // ── HTML — layout identique au PDF Java ──────────────────
    const bodyHtml = `
      <div class="a4">
        <!-- HEADER 2×2 bordé -->
        <table class="hdr" cellspacing="0" cellpadding="0">
          <tr>
            <td class="hdr-logo">
              ${co.logo ? `<img src="${co.logo}" alt="logo" />` : '&nbsp;'}
            </td>
            <td class="hdr-doctype">
              <div class="hdr-doctype-title">${typeLabel}</div>
              ${inv.number ? `<div class="hdr-doctype-line">N° : ${inv.number}</div>` : ''}
              <div class="hdr-doctype-line">Date : ${dateStr}</div>
              ${inv.dueDate ? `<div class="hdr-doctype-line">Échéance : ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td class="hdr-co">
              <div class="hdr-co-name">${companyName}</div>
              ${co.address ? `<div class="hdr-co-sub">${co.address}</div>` : ''}
              ${co.nif   ? `<div class="hdr-co-line">MF : ${co.nif}</div>`   : ''}
              ${co.rib   ? `<div class="hdr-co-line">RIB : ${co.rib}</div>`  : ''}
              ${co.phone ? `<div class="hdr-co-line">GSM : ${co.phone}</div>`: ''}
            </td>
            <td>
              <div class="hdr-cl-label">${clientLabel} :</div>
              <div class="hdr-cl-name">${partyName}</div>
              ${partyNif     ? `<div class="hdr-cl-line">MF : ${partyNif}</div>`         : ''}
              ${partyAddress ? `<div class="hdr-cl-line">Adresse : ${partyAddress}</div>`: ''}
            </td>
          </tr>
        </table>

        <!-- TABLEAU PRODUITS -->
        <table class="tbl">
          <thead>${thHtml}</thead>
          <tbody>${tdHtml}</tbody>
        </table>

        <!-- NOTES -->
        ${inv.notes ? `<div class="notes">Notes : ${inv.notes}</div>` : ''}

        <!-- CHAUFFEUR / CAMION (Bon de Livraison) -->
        ${isBonLivraison && (inv.driverName || inv.truckPlate) ? `
        <div class="extra">
          ${inv.driverName ? `Nom de chauffeur : ${inv.driverName}<br>` : ''}
          ${inv.truckPlate ? `Série de camion : ${inv.truckPlate}`      : ''}
        </div>` : ''}

        <!-- TOTAUX -->
        ${totHtml}

        <!-- MONTANT EN LETTRES -->
        ${!isMvt ? `<div class="words">Arrêté ${docWord} à la somme de ${amountWords}.</div>` : ''}

        <!-- SIGNATURE -->
        ${!isMvt ? `<div class="sig">Signature et cachet :</div>` : ''}
      </div>`;

    // ── Rendu iframe isolé (immunisé contre les CSS PrimeNG) ──
    const iframe = document.createElement('iframe');
    // position:absolute évite le bug de viewport sur position:fixed hors-écran
    iframe.style.cssText = `position:absolute;left:-9999px;top:0;width:${W}px;height:200px;border:0;visibility:hidden;`;
    document.body.appendChild(iframe);

    try {
      const idoc = iframe.contentDocument!;
      idoc.open();
      // La largeur est forcée sur html+body pour que offsetWidth == A4_W_PX
      idoc.write(`<!doctype html><html><head><meta charset="utf-8">
        <style>html,body{margin:0;padding:0;width:${W}px;}${css}</style>
        </head><body>${bodyHtml}</body></html>`);
      idoc.close();

      // Attendre le rendu complet (images + polices)
      await new Promise(r => setTimeout(r, 350));

      const target = idoc.querySelector('.a4') as HTMLElement;
      const h = target.offsetHeight;
      iframe.style.height = h + 'px';

      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: W,          // largeur fixe — pas scrollWidth (bugué hors-écran)
        height: h,
        windowWidth: W,
        windowHeight: h,
      });

      const pdfW = 210;
      const pdfH = Math.ceil((canvas.height / canvas.width) * pdfW * 100) / 100;
      const pdf  = new jsPDF({ unit: 'mm', format: [pdfW, pdfH], orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(`${typeLabel.replace(/ /g, '_')}-${inv.number || 'document'}.pdf`);
    } finally {
      document.body.removeChild(iframe);
    }
  }
}
