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
        // Fall back to the client-side renderer.
        // If the invoice was loaded from the list it won't have lines — fetch the full record first.
        const doPrint = (fullInv: any) => {
          if (this.settings) {
            this.doPrintA4(fullInv);
          } else {
            this.api.getCompanySettings().subscribe({
              next: s => { this.settings = s; this.currency = s.currency || 'TND'; this.doPrintA4(fullInv); },
              error: () => { this.settings = {}; this.doPrintA4(fullInv); }
            });
          }
        };
        if (inv.lines) {
          doPrint(inv);
        } else {
          const inv$ = this.auth.getToken()
            ? this.api.getInvoice(inv.id)
            : this.api.getPublicInvoice(inv.id);
          inv$.subscribe({ next: fullInv => doPrint(fullInv), error: () => doPrint(inv) });
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

  // ─────────────────────────────────────────────────────────────────────────
  // doPrintA4 — génération PDF native jsPDF (sans html2canvas)
  // Layout identique au Java InvoicePdfService (PDFBox)
  // ─────────────────────────────────────────────────────────────────────────
  private async doPrintA4(inv: any): Promise<void> {
    const co  = this.settings || {};
    const cur = this.currency;
    const f3  = (n: any) => Number(n || 0).toFixed(3);

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

    const showTVA      = !isMvt && (inv.taxRate       || 0) > 0;
    const showDiscount = !isMvt && (inv.globalDiscount || 0) > 0;
    const amountWords  = this.capitalize(this.numberToWords(inv.totalTTC || 0, cur));

    // ────────────────────────────────────────────────────────────
    // jsPDF natif — aucun html2canvas, aucun problème de largeur
    // Coordonnées en mm, identique au Java InvoicePdfService
    // ────────────────────────────────────────────────────────────
    const doc  = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const PW   = 210;
    const ML   = 13; const MT = 13; const MR = 13;
    const CW   = PW - ML - MR; // 184mm

    // helpers
    const blue  = () => doc.setTextColor(26, 58, 143);
    const black = () => doc.setTextColor(0, 0, 0);
    const rT    = (s: string, xR: number, y: number) => doc.text(s, xR - doc.getTextWidth(s), y);
    const cT    = (s: string, cx: number, y: number) => doc.text(s, cx - doc.getTextWidth(s) / 2, y);
    const sp    = (s: string, w: number): string[]   => doc.splitTextToSize(s || '-', w);

    // ── HEADER ───────────────────────────────────────────────
    const midX  = ML + CW * 0.68; // séparateur vertical ~138mm
    const leftW = midX - ML;      // colonne gauche ~125mm
    const rX    = midX + 2;       // colonne droite X
    const rW    = PW - MR - rX;   // colonne droite largeur ~57mm
    const lh    = 4.6;            // interligne standard

    // Pré-calcul hauteur ligne 2 (société + client)
    const coLines: Array<{ t: string; sz: number; bold: boolean; italic: boolean }> = [];
    coLines.push({ t: companyName,    sz: 12, bold: true,  italic: false });
    if (co.address) sp(co.address, leftW - 6).forEach((l: string) =>
      coLines.push({ t: l, sz: 9, bold: false, italic: true }));
    if (co.nif)   coLines.push({ t: `MF : ${co.nif}`,   sz: 9.5, bold: true, italic: false });
    if (co.rib)   coLines.push({ t: `RIB : ${co.rib}`,  sz: 9.5, bold: true, italic: false });
    if (co.phone) coLines.push({ t: `GSM : ${co.phone}`,sz: 9.5, bold: true, italic: false });
    const r2LeftH = coLines.length * lh + 6;

    const clLines: Array<{ t: string; sz: number; bold: boolean }> = [];
    clLines.push({ t: `${clientLabel} :`, sz: 9,  bold: true  });
    clLines.push({ t: partyName,          sz: 10, bold: true  });
    if (partyNif) clLines.push({ t: `MF : ${partyNif}`, sz: 9, bold: false });
    if (partyAddress) sp(`Adresse : ${partyAddress}`, rW - 2)
      .forEach((l: string) => clLines.push({ t: l, sz: 9, bold: false }));
    const r2H = Math.max(r2LeftH, clLines.length * lh + 6);

    // Hauteur ligne 1 (logo + type/N°/date)
    const logoAreaH = (co.logo && co.logo.includes(',')) ? 22 : 0;
    let r1RH = 7 + lh; // type label
    if (inv.number) r1RH += lh;
    r1RH += lh; // date
    if (inv.dueDate) r1RH += lh;
    const r1H    = Math.max(logoAreaH + 4, r1RH + 6);
    const hdrH   = r1H + r2H;
    const r1BotY = MT + r1H;
    const hdrBotY= MT + hdrH;


    // Logo
    if (co.logo && co.logo.includes(',')) {
      try {
        const fmt  = co.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        const img  = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = co.logo; });
        if (img.naturalWidth > 0) {
          const maxW = leftW - 4; const maxH = logoAreaH;
          let iw = maxW; let ih = iw * img.naturalHeight / img.naturalWidth;
          if (ih > maxH) { ih = maxH; iw = ih * img.naturalWidth / img.naturalHeight; }
          doc.addImage(co.logo, fmt, ML + 2, MT + (r1H - ih) / 2, iw, ih);
        }
      } catch (_) {}
    }

    // Type label (droite, row 1)
    let ry = MT + 5;
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); blue();
    rT(typeLabel, PW - MR - 2, ry); ry += 7;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); black();
    if (inv.number) { rT(`N° : ${inv.number}`, PW - MR - 2, ry); ry += lh; }
    rT(`Date : ${dateStr}`, PW - MR - 2, ry); ry += lh;
    if (inv.dueDate) rT(`Échéance : ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}`, PW - MR - 2, ry);

    // Société (gauche, row 2)
    let ly = r1BotY + 4;
    for (const cl of coLines) {
      doc.setFontSize(cl.sz);
      doc.setFont('times', cl.bold && cl.italic ? 'bolditalic' : cl.bold ? 'bold' : cl.italic ? 'italic' : 'normal');
      blue();
      doc.text(cl.t, ML + 2, ly); ly += (cl.sz >= 12 ? 5 : lh);
    }

    // Client (droite, row 2)
    let cly = r1BotY + 4;
    for (let i = 0; i < clLines.length; i++) {
      const cl = clLines[i];
      doc.setFontSize(cl.sz);
      doc.setFont('helvetica', cl.bold ? 'bold' : 'normal');
      i === 0 ? blue() : black();
      doc.text(cl.t, rX, cly); cly += lh + (i < 2 ? 0.5 : 0);
    }

    let y = hdrBotY + 8;

    // ── TABLE ────────────────────────────────────────────────
    const colW = isMvt
      ? [CW * 0.80, CW * 0.20]
      : [CW * 0.37, CW * 0.09, CW * 0.16, CW * 0.19, CW * 0.19];
    const colX = [ML];
    for (let i = 0; i < colW.length - 1; i++) colX.push(colX[i] + colW[i]);

    // En-tête tableau
    doc.setFillColor(235, 240, 255);
    doc.rect(ML, y - 3.5, CW, 7.5, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); blue();
    doc.text('Désignation', colX[0] + 1, y);
    rT('QTE', colX[1] + colW[1], y);
    if (!isMvt) {
      cT('DIM', colX[2] + colW[2] / 2, y);
      rT('P.unitaire', colX[3] + colW[3], y);
      rT('P.total',    colX[4] + colW[4], y);
    }
    y += 1;
    doc.setDrawColor(26, 58, 143); doc.setLineWidth(0.8);
    doc.line(ML, y, PW - MR, y);
    doc.setDrawColor(200, 215, 240); doc.setLineWidth(0.25);
    y += 5;

    // Lignes produits
    doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); black();
    const invLines = inv.lines || [];
    for (let i = 0; i < invLines.length; i++) {
      const l = invLines[i];
      let desc = l.description || '-';
      if (l.discountPercent > 0) desc += ` (-${l.discountPercent}%)`;
      const dLines = sp(desc, colW[0] - 3);
      const rowH   = Math.max(6, dLines.length * 5 + 2);
      dLines.forEach((dl: string, di: number) => doc.text(dl, colX[0] + 1, y + di * 5));
      rT(String(l.quantity), colX[1] + colW[1], y);
      if (!isMvt) {
        if (l.dimension) cT(String(l.dimension), colX[2] + colW[2] / 2, y);
        rT(f3(l.unitPrice), colX[3] + colW[3], y);
        rT(f3(l.totalHT),   colX[4] + colW[4], y);
      }
      y += rowH;
    }
    y += 4;

    // Notes
    if (inv.notes) {
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); black();
      sp(`Notes : ${inv.notes}`, CW).forEach((nl: string) => { doc.text(nl, ML, y); y += 5; });
      y += 2;
    }

    // Chauffeur / camion (Bon de Livraison)
    if (isBonLivraison && (inv.driverName || inv.truckPlate)) {
      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); black();
      if (inv.driverName) { doc.text(`Nom de chauffeur : ${inv.driverName}`, ML, y); y += 5; }
      if (inv.truckPlate) { doc.text(`Série de camion : ${inv.truckPlate}`, ML, y); y += 5; }
      y += 2;
    }

    // ── TOTAUX ───────────────────────────────────────────────
    if (!isMvt) {
      y += 6;
      const totX   = PW - MR - 90;
      const totLH  = 5.5;
      const totRow = (label: string, value: string, bold = false, sz = 10.5) => {
        doc.setFontSize(sz); doc.setFont('helvetica', bold ? 'bold' : 'normal'); black();
        doc.text(label, totX, y);
        rT(value, PW - MR, y);
        y += totLH;
      };

      totRow('Total HT', `${f3(inv.totalHT)} ${cur}`);
      if (showDiscount) totRow(
        `Remise (${inv.globalDiscount}%)`,
        `- ${f3((inv.totalHT||0)*(inv.globalDiscount||0)/100)} ${cur}`
      );
      if (showTVA) totRow(`TVA (${inv.taxRate}%)`, `${f3(inv.totalTVA)} ${cur}`);
      totRow('Timbre fiscal', `${f3(inv.stampDuty)} ${cur}`);

      totRow('TOTAL TTC', `${f3(inv.totalTTC)} ${cur}`, true, 12);

      // Montant en lettres
      doc.setFontSize(9.5); doc.setFont('helvetica', 'oblique'); black();
      sp(amountWords, 95).forEach((wl: string) => { doc.text(wl, totX, y); y += 4.5; });

      // Signature
      y += 10;
      doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); black();
      rT('Signature et cachet :', PW - MR, y);
    }

    doc.save(`${typeLabel.replace(/ /g, '_')}-${inv.number || 'document'}.pdf`);
  }
}
