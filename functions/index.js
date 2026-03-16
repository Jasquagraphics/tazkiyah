const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const express = require('express');

admin.initializeApp();

const APP_URL = String(process.env.APP_URL || 'https://gen-lang-client-0129508971.web.app').replace(/\/+$/, '');

const getFunctionsConfig = () => {
  try {
    return typeof functions.config === 'function' ? functions.config() || {} : {};
  } catch {
    return {};
  }
};

const getSmtpConfig = () => {
  const cfg = getFunctionsConfig();
  const smtp = cfg.smtp || {};

  const provider = String(smtp.provider || process.env.SMTP_PROVIDER || '').trim().toLowerCase();
  const host = String(smtp.host || process.env.SMTP_HOST || '').trim() || (provider === 'gmail' ? 'smtp.gmail.com' : '');
  const portRaw = Number(smtp.port || process.env.SMTP_PORT || (provider === 'gmail' ? 465 : 587));
  const port = Number.isFinite(portRaw) ? portRaw : provider === 'gmail' ? 465 : 587;
  const user = String(smtp.user || process.env.SMTP_USER || '').trim();
  const pass = String(smtp.pass || process.env.SMTP_PASS || '').trim();
  const from = String(smtp.from || process.env.SMTP_FROM || '').trim();
  const secure = String(smtp.secure || process.env.SMTP_SECURE || '').trim();

  return {
    provider,
    host,
    port,
    user,
    pass,
    from,
    secure: secure ? secure === 'true' : port === 465
  };
};

let smtpTransporter = null;
const getSmtpTransporter = () => {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;
  if (smtpTransporter) return smtpTransporter;

  smtpTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  });

  return smtpTransporter;
};

const getFromAddress = () => {
  const cfg = getSmtpConfig();
  if (cfg.from) return cfg.from;
  if (cfg.user) return cfg.user;
  return 'no-reply@example.com';
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = getSmtpTransporter();
  if (!transporter) return { ok: false, skipped: true, error: 'SMTP not configured' };
  const from = getFromAddress();
  await transporter.sendMail({
    from,
    to,
    subject: String(subject),
    ...(text ? { text: String(text) } : {}),
    ...(html ? { html: String(html) } : {})
  });
  return { ok: true };
};

const enqueueEmailOnce = async ({ key, to, subject, text, html }) => {
  const cleanedTo = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (cleanedTo.length === 0) return;
  if (!subject) return;

  const db = admin.firestore();
  const ref = db.collection('mail').doc(String(key || '').slice(0, 140) || db.collection('mail').doc().id);

  try {
    await ref.create({
      to: cleanedTo,
      message: {
        subject: String(subject),
        ...(text ? { text: String(text) } : {}),
        ...(html ? { html: String(html) } : {})
      },
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    const code = e?.code || e?.errorInfo?.code || '';
    if (code === 6 || code === 'already-exists') return;
    return;
  }

  try {
    const result = await sendEmail({
      to: cleanedTo.join(', '),
      subject,
      text,
      html
    });

    if (result.skipped) {
      await ref.update({
        status: 'skipped',
        error: String(result.error || 'Skipped'),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return;
    }

    await ref.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    await ref.update({
      status: 'error',
      error: String(e?.message || e),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
};

const requireAuth = (context) => {
  if (!context?.auth?.uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  return context.auth.uid;
};

const isAdminUid = async (uid) => {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  const role = snap.exists ? snap.data().role : null;
  return role === 'admin';
};

const requireAdmin = async (context) => {
  const uid = requireAuth(context);
  const ok = await isAdminUid(uid);
  if (!ok) throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  return uid;
};

const getRequestIp = (rawReq) => {
  const xff = String(rawReq?.headers?.['x-forwarded-for'] || '').trim();
  if (xff) return xff.split(',')[0].trim();
  const realIp = String(rawReq?.headers?.['x-real-ip'] || '').trim();
  if (realIp) return realIp;
  return String(rawReq?.ip || '').trim();
};

const isHtmlTemplatePath = (storagePath) => {
  const p = String(storagePath || '').trim().toLowerCase();
  return p.endsWith('.html') || p.endsWith('.htm');
};

const escapeHtmlText = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, ' ');
};

const replaceTokensInHtmlText = ({ html, tokenToReplacement }) => {
  const src = String(html || '');
  const lower = src.toLowerCase();
  const entries = Array.from(tokenToReplacement.entries()).sort((a, b) => b[0].length - a[0].length);
  let out = '';
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    if (ch === '<') {
      const restLower = lower.slice(i);

      if (restLower.startsWith('<style')) {
        const end = lower.indexOf('</style>', i);
        if (end === -1) {
          out += src.slice(i);
          break;
        }
        const closeEnd = lower.indexOf('>', end);
        if (closeEnd === -1) {
          out += src.slice(i);
          break;
        }
        out += src.slice(i, closeEnd + 1);
        i = closeEnd + 1;
        continue;
      }

      if (restLower.startsWith('<script')) {
        const end = lower.indexOf('</script>', i);
        if (end === -1) {
          out += src.slice(i);
          break;
        }
        const closeEnd = lower.indexOf('>', end);
        if (closeEnd === -1) {
          out += src.slice(i);
          break;
        }
        out += src.slice(i, closeEnd + 1);
        i = closeEnd + 1;
        continue;
      }

      const tagEnd = src.indexOf('>', i);
      if (tagEnd === -1) {
        out += src.slice(i);
        break;
      }
      out += src.slice(i, tagEnd + 1);
      i = tagEnd + 1;
      continue;
    }

    const nextTag = src.indexOf('<', i);
    const chunk = nextTag === -1 ? src.slice(i) : src.slice(i, nextTag);
    let nextChunk = chunk;
    for (const [token, replacement] of entries) {
      if (!token) continue;
      nextChunk = nextChunk.split(token).join(replacement);
    }
    out += nextChunk;
    if (nextTag === -1) break;
    i = nextTag;
  }

  return out;
};

const fillAgreementHtmlTemplate = ({ templateHtml, agreement }) => {
  const now = new Date();
  const dateText = String(agreement?.draft_date_text || now.toISOString().slice(0, 10));
  const artistName = String(agreement?.artist_name || '');
  const legalName = String(agreement?.legal_name || '');
  const country = String(agreement?.legal_country || '');
  const address = String(agreement?.legal_full_address || '');
  const phone = String(agreement?.legal_phone || '');
  const email = String(agreement?.artist_email || '');
  const aadhaar = String(agreement?.legal_id_number || '');
  const artistPct = `${String(agreement?.revenue_share_artist ?? '')}%`;
  const labelPct = `${String(agreement?.revenue_share_label ?? '')}%`;

  const replacements = new Map([
    ['agreement_date', dateText],
    ['artist_name', artistName],
    ['legal_name', legalName || artistName],
    ['country', country],
    ['address', address],
    ['phone', phone],
    ['email', email],
    ['aadhaar', aadhaar],
    ['revenue_artist', artistPct],
    ['revenue_label', labelPct],
    ['party2_name_final', legalName || artistName],
    ['party1_date', dateText],
    ['party2_date', dateText]
  ]);

  const tokenToReplacement = new Map();
  for (const [token, raw] of replacements.entries()) {
    const safe = escapeHtmlText(raw);
    tokenToReplacement.set(token, `<span class="ss-fill">${safe}</span>`);
  }

  return replaceTokensInHtmlText({ html: templateHtml, tokenToReplacement });
};

const renderHtmlToPdfBuffer = async (html) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  try {
    const page = await browser.newPage();
    await page.setContent(String(html || ''), { waitUntil: ['load', 'domcontentloaded'] });
    await page.addStyleTag({
      content: `
        .ss-fill {
          font-family: "Open Sans", sans-serif !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          font-style: inherit !important;
          font-variant-ligatures: none !important;
          font-feature-settings: "liga" 0, "clig" 0 !important;
          font-variant-numeric: lining-nums tabular-nums !important;
        }
      `
    });
    const buf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
};

const buildAndUploadAgreementFilledPdf = async ({ templateStoragePath, filledStoragePath, agreement }) => {
  const bucket = admin.storage().bucket();
  const [templateBuffer] = await bucket.file(templateStoragePath).download();
  let filledPdfBuffer = templateBuffer;

  if (isHtmlTemplatePath(templateStoragePath)) {
    const templateHtml = templateBuffer.toString('utf8');
    const filledHtml = fillAgreementHtmlTemplate({ templateHtml, agreement });
    filledPdfBuffer = await renderHtmlToPdfBuffer(filledHtml);
  }

  await bucket.file(filledStoragePath).save(filledPdfBuffer, { contentType: 'application/pdf' });
};

const parsePngDataUrlToBuffer = (dataUrl) => {
  const raw = String(dataUrl || '');
  const m = raw.match(/^data:image\/png;base64,(.+)$/);
  if (!m) return null;
  try {
    return Buffer.from(m[1], 'base64');
  } catch {
    return null;
  }
};

const buildSignedPdf = async ({ originalPdfBuffer, signaturePngBuffer }) => {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const pages = pdfDoc.getPages();
  const targetPageIndexRaw = Number(process.env.SIGNATURE_PAGE || 1);
  const targetPageIndex = Math.min(Math.max(1, Number.isFinite(targetPageIndexRaw) ? targetPageIndexRaw : pages.length), pages.length) - 1;
  const targetPage = pages[targetPageIndex];

  const signatureImage = await pdfDoc.embedPng(signaturePngBuffer);
  const x = Number(process.env.SIGNATURE_X || 410);
  const y = Number(process.env.SIGNATURE_Y || 275);
  const w = Number(process.env.SIGNATURE_W || 120);
  const h = Number(process.env.SIGNATURE_H || 80);

  targetPage.drawImage(signatureImage, {
    x: Number.isFinite(x) ? x : 410,
    y: Number.isFinite(y) ? y : 275,
    width: Number.isFinite(w) ? w : 120,
    height: Number.isFinite(h) ? h : 80
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width: pageW } = targetPage.getSize();
  const auditPage = pdfDoc.addPage();
  auditPage.drawText('Agreement signed', { x: 48, y: 760, size: 18, font, color: rgb(0.12, 0.12, 0.14) });
  auditPage.drawText(`Generated: ${new Date().toISOString()}`, { x: 48, y: 735, size: 10, font, color: rgb(0.42, 0.42, 0.46), maxWidth: pageW - 96 });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
};

exports.onAuthUserDelete = functions.auth.user().onDelete(async (user) => {
  const db = admin.firestore();
  await db.doc(`users/${user.uid}`).delete().catch(() => null);

  const deleteByArtistId = async (collectionName) => {
    const coll = db.collection(collectionName);
    let lastDoc = null;
    while (true) {
      let q = coll.where('artist_id', '==', user.uid).limit(400);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      lastDoc = snap.docs[snap.docs.length - 1];
    }
  };

  await deleteByArtistId('withdrawals').catch(() => null);
  await deleteByArtistId('revenues').catch(() => null);
  await deleteByArtistId('releases').catch(() => null);

  return null;
});

exports.cleanupDraftAuthUsers = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoffMs = Date.now() - 2 * 60 * 60 * 1000;

    const snap = await db.collection('users').where('role', '==', 'artist').where('status', '==', 'draft').get();
    if (snap.empty) return null;

    const auth = admin.auth();
    const deletions = snap.docs.map(async (d) => {
      const data = d.data() || {};
      const createdAt = data.created_at;
      let createdAtMs = 0;

      if (createdAt && typeof createdAt.toMillis === 'function') {
        createdAtMs = createdAt.toMillis();
      } else if (typeof createdAt === 'string') {
        const t = Date.parse(createdAt);
        createdAtMs = Number.isFinite(t) ? t : 0;
      }

      if (!createdAtMs || createdAtMs > cutoffMs) return;
      const uid = d.id;

      try {
        await auth.deleteUser(uid);
      } catch (e) {
        const code = e?.errorInfo?.code || e?.code || '';
        if (code === 'auth/user-not-found') {
          await d.ref.delete().catch(() => null);
          return;
        }
      }
    });

    await Promise.allSettled(deletions);
    return null;
  });

exports.agreementsPreview = functions
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .https.onCall(async (data, context) => {
    await requireAdmin(context);

    const artistId = String(data?.artist_id || '');
    const templateStoragePath = String(data?.template_storage_path || 'agreement_templates/Agreement.pdf');
    const artistShare = Number(data?.revenue_share_artist);
    const labelShare = Number(data?.revenue_share_label);

    if (!artistId) throw new functions.https.HttpsError('invalid-argument', 'artist_id is required.');
    if (!Number.isFinite(artistShare) || !Number.isFinite(labelShare)) {
      throw new functions.https.HttpsError('invalid-argument', 'Revenue share values are required.');
    }

    const db = admin.firestore();
    const artistSnap = await db.doc(`users/${artistId}`).get();
    if (!artistSnap.exists) throw new functions.https.HttpsError('not-found', 'Artist not found.');
    const artist = artistSnap.data() || {};

    const now = new Date();
    const createdAt = now.toISOString();
    const agreementRef = db.collection('agreements').doc();
    const agreementId = agreementRef.id;
    const filledStoragePath = `agreements/${agreementId}/filled.pdf`;

    const agreementDoc = {
      id: agreementId,
      artist_id: artistId,
      artist_name: String(artist.name || ''),
      artist_email: String(artist.email || ''),
      legal_name: String(artist.legal_name || ''),
      legal_country: String(artist.legal_country || ''),
      legal_full_address: String(artist.legal_full_address || ''),
      legal_phone: String(artist.legal_phone || ''),
      legal_id_number: String(artist.legal_id_number || ''),
      revenue_share_artist: artistShare,
      revenue_share_label: labelShare,
      template_storage_path: templateStoragePath,
      filled_pdf_storage_path: filledStoragePath,
      status: 'draft',
      created_at: createdAt,
      draft_date_text: createdAt.slice(0, 10)
    };

    await agreementRef.set(agreementDoc);
    await buildAndUploadAgreementFilledPdf({ templateStoragePath, filledStoragePath, agreement: agreementDoc });

    return { agreement_id: agreementId, filled_pdf_storage_path: filledStoragePath };
  });

exports.agreementsSend = functions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const agreementId = String(data?.agreement_id || '');
  if (!agreementId) throw new functions.https.HttpsError('invalid-argument', 'agreement_id is required.');

  const db = admin.firestore();
  const agreementRef = db.doc(`agreements/${agreementId}`);
  const agreementSnap = await agreementRef.get();
  if (!agreementSnap.exists) throw new functions.https.HttpsError('not-found', 'Agreement not found.');
  const agreement = agreementSnap.data() || {};

  const artistId = String(agreement.artist_id || '');
  const filledStoragePath = String(agreement.filled_pdf_storage_path || '');
  if (!artistId || !filledStoragePath) throw new functions.https.HttpsError('failed-precondition', 'Agreement preview must be generated first.');

  const sentAt = new Date().toISOString();
  const prevTrail = Array.isArray(agreement.audit_trail) ? agreement.audit_trail : [];
  await agreementRef.update({
    status: 'sent',
    sent_at: sentAt,
    audit_trail: [...prevTrail, { event: 'sent', at: sentAt, by_uid: adminUid }]
  });

  await db.doc(`users/${artistId}`).update({ active_agreement_id: agreementId }).catch(() => null);
  return { agreement_id: agreementId };
});

exports.agreementsMarkViewed = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const agreementId = String(data?.agreement_id || '');
  if (!agreementId) throw new functions.https.HttpsError('invalid-argument', 'agreement_id is required.');

  const db = admin.firestore();
  const agreementRef = db.doc(`agreements/${agreementId}`);
  const nowIso = new Date().toISOString();
  const ip = getRequestIp(context?.rawRequest);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(agreementRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Agreement not found.');
    const agreement = snap.data() || {};
    if (String(agreement.artist_id || '') !== uid) throw new functions.https.HttpsError('permission-denied', 'Not allowed.');
    if (String(agreement.status || '') !== 'sent') return;
    if (agreement.viewed_at) return;
    const prevTrail = Array.isArray(agreement.audit_trail) ? agreement.audit_trail : [];
    tx.update(agreementRef, {
      viewed_at: nowIso,
      audit_trail: [...prevTrail, { event: 'viewed', at: nowIso, by_uid: uid, ip }]
    });
  });

  return { ok: true };
});

exports.agreementsSign = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const agreementId = String(data?.agreement_id || '');
  if (!agreementId) throw new functions.https.HttpsError('invalid-argument', 'agreement_id is required.');

  const signatureDataUrl = String(data?.signature_data_url || '');
  const signerName = String(data?.signer_name || '');
  const signerEmail = String(data?.signer_email || '');
  const signaturePngBuffer = parsePngDataUrlToBuffer(signatureDataUrl);
  if (!signaturePngBuffer) throw new functions.https.HttpsError('invalid-argument', 'signature_data_url must be a PNG data URL.');
  if (signaturePngBuffer.length > 2_000_000) throw new functions.https.HttpsError('invalid-argument', 'Signature image is too large.');

  const db = admin.firestore();
  const agreementRef = db.doc(`agreements/${agreementId}`);
  const agreementSnap = await agreementRef.get();
  if (!agreementSnap.exists) throw new functions.https.HttpsError('not-found', 'Agreement not found.');
  const agreement = agreementSnap.data() || {};

  if (String(agreement.artist_id || '') !== uid) throw new functions.https.HttpsError('permission-denied', 'Not allowed.');
  if (String(agreement.status || '') !== 'sent') throw new functions.https.HttpsError('failed-precondition', 'Agreement is not ready for signing.');

  const filledStoragePath = String(agreement.filled_pdf_storage_path || '');
  if (!filledStoragePath) throw new functions.https.HttpsError('failed-precondition', 'Agreement PDF is missing.');

  const bucket = admin.storage().bucket();
  const [originalPdfBuffer] = await bucket.file(filledStoragePath).download();

  const signedAt = new Date().toISOString();
  const ip = getRequestIp(context?.rawRequest);
  const signedPdfBuffer = await buildSignedPdf({ originalPdfBuffer, signaturePngBuffer });

  const signatureStoragePath = `agreements/${agreementId}/signature.png`;
  const signedStoragePath = `agreements/${agreementId}/signed.pdf`;

  await bucket.file(signatureStoragePath).save(signaturePngBuffer, { contentType: 'image/png' });
  await bucket.file(signedStoragePath).save(signedPdfBuffer, { contentType: 'application/pdf' });

  const prevTrail = Array.isArray(agreement.audit_trail) ? agreement.audit_trail : [];
  await agreementRef.update({
    status: 'signed',
    signed_at: signedAt,
    signer_name: signerName,
    signer_email: signerEmail,
    signer_ip: ip,
    signature_png_storage_path: signatureStoragePath,
    signed_pdf_storage_path: signedStoragePath,
    audit_trail: [...prevTrail, { event: 'signed', at: signedAt, by_uid: uid, ip }]
  });

  const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
  const notifications = adminsSnap.docs.map((d) =>
    db.collection('notifications').add({
      user_id: d.id,
      title: 'Agreement signed',
      message: `${String(agreement.artist_name || 'An artist')} signed the agreement.`,
      type: 'agreement_signed',
      created_at: signedAt,
      is_read: false,
      agreement_id: agreementId,
      artist_id: String(agreement.artist_id || '')
    })
  );
  await Promise.allSettled(notifications);

  return { agreement_id: agreementId };
});

exports.agreementsSubmitForVerification = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const agreementId = String(data?.agreement_id || '');
  if (!agreementId) throw new functions.https.HttpsError('invalid-argument', 'agreement_id is required.');

  const db = admin.firestore();
  const agreementRef = db.doc(`agreements/${agreementId}`);
  const submittedAt = new Date().toISOString();
  const ip = getRequestIp(context?.rawRequest);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(agreementRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Agreement not found.');
    const agreement = snap.data() || {};
    if (String(agreement.artist_id || '') !== uid) throw new functions.https.HttpsError('permission-denied', 'Not allowed.');
    if (String(agreement.status || '') !== 'signed') throw new functions.https.HttpsError('failed-precondition', 'Agreement must be signed before submitting.');
    const prevTrail = Array.isArray(agreement.audit_trail) ? agreement.audit_trail : [];
    tx.update(agreementRef, {
      status: 'submitted',
      submitted_at: submittedAt,
      audit_trail: [...prevTrail, { event: 'submitted_for_verification', at: submittedAt, by_uid: uid, ip }]
    });
  });

  const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
  const notifications = adminsSnap.docs.map((d) =>
    db.collection('notifications').add({
      user_id: d.id,
      title: 'Agreement submitted',
      message: 'An artist submitted a signed agreement for verification.',
      type: 'agreement_submitted',
      created_at: submittedAt,
      is_read: false,
      agreement_id: agreementId
    })
  );
  await Promise.allSettled(notifications);

  return { agreement_id: agreementId };
});

exports.agreementsVerify = functions.https.onCall(async (data, context) => {
  const adminUid = await requireAdmin(context);
  const agreementId = String(data?.agreement_id || '');
  if (!agreementId) throw new functions.https.HttpsError('invalid-argument', 'agreement_id is required.');

  const db = admin.firestore();
  const agreementRef = db.doc(`agreements/${agreementId}`);
  const verifiedAt = new Date().toISOString();

  let artistId = '';
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(agreementRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Agreement not found.');
    const agreement = snap.data() || {};
    artistId = String(agreement.artist_id || '');
    if (String(agreement.status || '') !== 'submitted') throw new functions.https.HttpsError('failed-precondition', 'Agreement is not ready for verification.');
    const prevTrail = Array.isArray(agreement.audit_trail) ? agreement.audit_trail : [];
    tx.update(agreementRef, {
      status: 'verified',
      verified_at: verifiedAt,
      verified_by_uid: adminUid,
      audit_trail: [...prevTrail, { event: 'verified', at: verifiedAt, by_uid: adminUid }]
    });
  });

  if (artistId) {
    await db.collection('notifications').add({
      user_id: artistId,
      title: 'Agreement verified',
      message: 'Your signed agreement has been verified by admin.',
      type: 'agreement_verified',
      created_at: verifiedAt,
      is_read: false,
      agreement_id: agreementId
    });
  }

  return { agreement_id: agreementId };
});

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toFixed(2);
};

exports.onUserStatusEmail = functions.firestore.document('users/{userId}').onWrite(async (change, context) => {
  const after = change.after.exists ? change.after.data() || {} : null;
  const before = change.before.exists ? change.before.data() || {} : null;
  if (!after) return null;

  const role = String(after.role || '');
  if (role !== 'artist') return null;

  const email = String(after.email || '');
  if (!email) return null;

  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');
  if (beforeStatus === afterStatus) return null;

  const name = String(after.name || 'Artist');
  const keyBase = `user_${context.params.userId}_${afterStatus}`;

  if (afterStatus === 'pending') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Account pending approval',
      text: `Hi ${name},\n\nYour account is now pending approval. We’ll email you once it’s reviewed.\n\n${APP_URL}`
    });
  } else if (afterStatus === 'approved') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Account approved',
      text: `Hi ${name},\n\nYour account has been approved. You can now continue in the dashboard.\n\n${APP_URL}`
    });
  } else if (afterStatus === 'rejected') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Account update',
      text: `Hi ${name},\n\nYour account status was updated. Please log in for details.\n\n${APP_URL}`
    });
  }

  return null;
});

exports.onAgreementStatusEmail = functions.firestore.document('agreements/{agreementId}').onWrite(async (change, context) => {
  const after = change.after.exists ? change.after.data() || {} : null;
  const before = change.before.exists ? change.before.data() || {} : null;
  if (!after) return null;

  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');
  if (beforeStatus === afterStatus) return null;

  const email = String(after.artist_email || '');
  if (!email) return null;

  const name = String(after.artist_name || 'Artist');
  const agreementId = String(after.id || context.params.agreementId);
  const agreementLink = `${APP_URL}/profile?agreement=${encodeURIComponent(agreementId)}`;
  const keyBase = `agr_${agreementId}_${afterStatus}`;

  if (afterStatus === 'sent') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Agreement received',
      text: `Hi ${name},\n\nAn agreement is ready for your signature.\n\nOpen: ${agreementLink}`
    });
  } else if (afterStatus === 'signed') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Agreement signed successfully',
      text: `Hi ${name},\n\nWe received your signed agreement. You can submit it for verification from your profile.\n\nOpen: ${agreementLink}`
    });
  } else if (afterStatus === 'submitted') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Agreement submitted for verification',
      text: `Hi ${name},\n\nYour agreement was submitted for verification. We’ll email you once it’s verified.\n\nOpen: ${agreementLink}`
    });
  } else if (afterStatus === 'verified') {
    await enqueueEmailOnce({
      key: keyBase,
      to: email,
      subject: 'Agreement verified',
      text: `Hi ${name},\n\nYour agreement has been verified by admin.\n\nOpen: ${agreementLink}`
    });
  }

  return null;
});

exports.onWithdrawalStatusEmail = functions.firestore.document('withdrawals/{withdrawalId}').onWrite(async (change, context) => {
  const after = change.after.exists ? change.after.data() || {} : null;
  const before = change.before.exists ? change.before.data() || {} : null;
  if (!after) return null;

  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');
  if (beforeStatus === afterStatus) return null;

  const artistId = String(after.artist_id || '');
  if (!artistId) return null;

  const db = admin.firestore();
  const userSnap = await db.doc(`users/${artistId}`).get();
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const email = String(user.email || after.artist_email || '');
  if (!email) return null;

  const name = String(user.name || after.artist_name || 'Artist');
  const amountText = after.amount != null ? `$${formatMoney(after.amount)}` : '';
  const link = `${APP_URL}/wallet`;
  const keyBase = `wd_${context.params.withdrawalId}_${afterStatus}`;

  const subject =
    afterStatus === 'approved'
      ? 'Withdrawal request approved'
      : afterStatus === 'rejected'
        ? 'Withdrawal request rejected'
        : afterStatus === 'completed'
          ? 'Withdrawal completed'
          : '';
  if (!subject) return null;

  const message =
    afterStatus === 'approved'
      ? `Hi ${name},\n\nYour withdrawal request ${amountText ? `(${amountText}) ` : ''}was approved.`
      : afterStatus === 'rejected'
        ? `Hi ${name},\n\nYour withdrawal request ${amountText ? `(${amountText}) ` : ''}was rejected. Please check your wallet for details.`
        : `Hi ${name},\n\nYour withdrawal ${amountText ? `(${amountText}) ` : ''}has been marked as completed.`;

  await enqueueEmailOnce({ key: keyBase, to: email, subject, text: `${message}\n\nOpen: ${link}` });
  return null;
});

exports.onReleaseStatusEmail = functions.firestore.document('releases/{releaseId}').onWrite(async (change, context) => {
  const after = change.after.exists ? change.after.data() || {} : null;
  const before = change.before.exists ? change.before.data() || {} : null;
  if (!after) return null;

  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');
  if (beforeStatus === afterStatus) return null;

  const artistId = String(after.artist_id || '');
  if (!artistId) return null;

  const db = admin.firestore();
  const userSnap = await db.doc(`users/${artistId}`).get();
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const email = String(user.email || after.artist_email || '');
  if (!email) return null;

  const name = String(user.name || after.artist_name || 'Artist');
  const title = String(after.title || 'your release');
  const releaseId = String(context.params.releaseId || '');
  const link = `${APP_URL}/release/${encodeURIComponent(releaseId)}`;
  const keyBase = `rel_${releaseId}_${afterStatus}`;

  const statusLabel = afterStatus === 'streamed' ? 'released' : afterStatus.replace(/_/g, ' ');

  if (['pending', 'approved', 'rejected', 'streamed', 'action_required'].includes(afterStatus)) {
    const subject =
      afterStatus === 'pending'
        ? 'Release submission received'
        : afterStatus === 'approved'
          ? 'Release submission approved'
          : afterStatus === 'rejected'
            ? 'Release submission rejected'
            : afterStatus === 'streamed'
              ? 'Release marked as released'
              : 'Release needs action';

    const remarks = String(after.admin_remarks || '').trim();
    const base = `Hi ${name},\n\nYour release "${title}" is now ${statusLabel}.`;
    const full = remarks ? `${base}\n\nRemarks: ${remarks}` : base;

    await enqueueEmailOnce({ key: keyBase, to: email, subject, text: `${full}\n\nOpen: ${link}` });
  }

  return null;
});

exports.onRevenueCreatedEmail = functions.firestore.document('revenues/{revenueId}').onCreate(async (snap, context) => {
  const data = snap.data() || {};
  const artistId = String(data.artist_id || '');
  if (!artistId) return null;

  const db = admin.firestore();
  const userSnap = await db.doc(`users/${artistId}`).get();
  const user = userSnap.exists ? userSnap.data() || {} : {};
  const email = String(user.email || '');
  if (!email) return null;

  const name = String(user.name || 'Artist');
  const amountText = data.amount != null ? `$${formatMoney(data.amount)}` : 'revenue';
  const platform = String(data.platform || '');
  const releaseId = String(data.release_id || '');
  let releaseTitle = '';
  if (releaseId) {
    const rSnap = await db.doc(`releases/${releaseId}`).get();
    if (rSnap.exists) releaseTitle = String((rSnap.data() || {}).title || '');
  }

  const keyBase = `rev_${context.params.revenueId}`;
  const link = `${APP_URL}/wallet`;
  const details = `${amountText}${platform ? ` from ${platform}` : ''}${releaseTitle ? ` for "${releaseTitle}"` : ''}`;

  await enqueueEmailOnce({
    key: keyBase,
    to: email,
    subject: 'New revenue added',
    text: `Hi ${name},\n\n${details} has been added to your account.\n\nOpen: ${link}`
  });

  return null;
});

exports.onTicketMessageEmail = functions.firestore.document('messages/{messageId}').onCreate(async (snap, context) => {
  const msg = snap.data() || {};
  const ticketId = String(msg.ticket_id || '');
  const senderId = String(msg.sender_id || '');
  if (!ticketId || !senderId) return null;

  const db = admin.firestore();
  const [ticketSnap, senderSnap] = await Promise.all([db.doc(`tickets/${ticketId}`).get(), db.doc(`users/${senderId}`).get()]);
  if (!ticketSnap.exists) return null;

  const ticket = ticketSnap.data() || {};
  const senderRole = senderSnap.exists ? String((senderSnap.data() || {}).role || '') : '';
  if (senderRole !== 'admin') return null;

  const email = String(ticket.artist_email || '');
  if (!email) return null;

  const name = String(ticket.artist_name || 'Artist');
  const subjectText = String(ticket.subject || 'Support ticket');
  const content = String(msg.content || '').trim();
  const hasAttachment = !!String(msg.file_url || '').trim();
  const preview = content ? content : hasAttachment ? 'Attachment sent' : 'New message';
  const link = `${APP_URL}/support`;

  await enqueueEmailOnce({
    key: `tmsg_${ticketId}_${context.params.messageId}`,
    to: email,
    subject: `New reply: ${subjectText}`,
    text: `Hi ${name},\n\nYou have a new reply on your ticket "${subjectText}":\n\n${preview}\n\nOpen: ${link}`
  });

  return null;
});

exports.onTicketClosedEmail = functions.firestore.document('tickets/{ticketId}').onUpdate(async (change, context) => {
  const after = change.after.data() || {};
  const before = change.before.data() || {};

  const beforeStatus = String(before.status || '');
  const afterStatus = String(after.status || '');
  if (beforeStatus === afterStatus) return null;
  if (afterStatus !== 'closed') return null;

  const email = String(after.artist_email || '');
  if (!email) return null;

  const name = String(after.artist_name || 'Artist');
  const subjectText = String(after.subject || 'Support ticket');
  const link = `${APP_URL}/support`;

  await enqueueEmailOnce({
    key: `tclosed_${context.params.ticketId}`,
    to: email,
    subject: `Ticket closed: ${subjectText}`,
    text: `Hi ${name},\n\nYour support ticket "${subjectText}" has been closed.\n\nOpen: ${link}`
  });

  return null;
});

const getApiBaseUrl = (req) => {
  const protoRaw = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const hostRaw = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const proto = protoRaw || 'https';
  const host = hostRaw || String(req.headers.host || '');
  return `${proto}://${host}`.replace(/\/+$/, '');
};

const getGoogleOAuthConfig = () => {
  const cfg = getFunctionsConfig();
  const google = cfg.google || {};
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID || google.client_id || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || google.client_secret || '').trim(),
    redirectUri: String(process.env.GOOGLE_REDIRECT_URI || google.redirect_uri || '').trim()
  };
};

const ensureDocExists = async (ref, initialData) => {
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set(initialData, { merge: true });
};

const getNextNumericId = async ({ collection, counterDocId }) => {
  const db = admin.firestore();
  const counterRef = db.collection('counters').doc(String(counterDocId));
  await ensureDocExists(counterRef, { value: 0 });

  const next = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const value = Number((snap.data() || {}).value || 0);
    const nextValue = value + 1;
    tx.set(counterRef, { value: nextValue }, { merge: true });
    return nextValue;
  });

  return next;
};

const apiApp = express();
apiApp.use(express.json({ limit: '2mb' }));

apiApp.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

apiApp.post('/api/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim();
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });

  const db = admin.firestore();
  const existingSnap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!existingSnap.empty) return res.status(400).json({ error: 'Email already exists' });

  const id = await getNextNumericId({ collection: 'users', counterDocId: 'users' });
  const user = {
    id,
    email,
    password,
    name,
    role: 'artist',
    status: 'onboarding',
    balance: 0,
    created_at: new Date().toISOString()
  };

  await db.collection('users').doc(String(id)).set(user, { merge: false });
  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

apiApp.post('/api/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const db = admin.firestore();
  const snap = await db.collection('users').where('email', '==', email).where('password', '==', password).limit(1).get();
  if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });
  const user = snap.docs[0].data() || {};
  delete user.password;
  return res.json(user);
});

apiApp.get('/api/auth/google/url', async (req, res) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const effectiveRedirect = redirectUri || `${getApiBaseUrl(req)}/api/auth/google/callback`;
  if (!clientId) return res.status(500).json({ error: 'Google OAuth is not configured' });

  const state = require('crypto').randomBytes(16).toString('hex');
  const db = admin.firestore();
  await db.collection('oauth_states').doc(state).set({
    state,
    expires_at: Date.now() + 10 * 60 * 1000,
    created_at: Date.now()
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: effectiveRedirect,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent'
  });

  return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

apiApp.get('/api/auth/google/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const effectiveRedirect = redirectUri || `${getApiBaseUrl(req)}/api/auth/google/callback`;

  const sendPopup = (payload) => {
    res.status(200).send(
      `<html><body><script>
      window.opener && window.opener.postMessage(${JSON.stringify(payload)}, '*');
      window.close();
      </script></body></html>`
    );
  };

  if (!code || !state) return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: 'Missing OAuth parameters' });
  if (!clientId || !clientSecret) return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: 'Google OAuth is not configured' });

  const db = admin.firestore();
  const stateRef = db.collection('oauth_states').doc(state);
  const stateSnap = await stateRef.get();
  await stateRef.delete().catch(() => null);
  const expiresAt = Number((stateSnap.data() || {}).expires_at || 0);
  if (!stateSnap.exists || !expiresAt || expiresAt < Date.now()) {
    return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: 'Invalid OAuth state' });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirect,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      const errMsg = tokenJson?.error_description || tokenJson?.error || 'Failed to exchange OAuth token';
      return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: String(errMsg) });
    }

    const accessToken = String(tokenJson.access_token || '');
    if (!accessToken) return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: 'Missing access token' });

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok) return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: String(userInfo?.error?.message || 'Failed to fetch Google profile') });

    const email = String(userInfo.email || '').trim().toLowerCase();
    const name = String(userInfo.name || userInfo.given_name || 'Artist').trim();
    const googleId = String(userInfo.sub || '').trim();
    const profileImage = String(userInfo.picture || '').trim();
    if (!email || !googleId) return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: 'Google profile is missing required fields' });

    const byGoogle = await db.collection('users').where('google_id', '==', googleId).limit(1).get();
    const byEmail = byGoogle.empty ? await db.collection('users').where('email', '==', email).limit(1).get() : null;

    let userDocRef = null;
    if (!byGoogle.empty) userDocRef = byGoogle.docs[0].ref;
    else if (byEmail && !byEmail.empty) userDocRef = byEmail.docs[0].ref;

    if (userDocRef) {
      await userDocRef.set(
        {
          email,
          google_id: googleId,
          profile_image: profileImage,
          name
        },
        { merge: true }
      );
    } else {
      const id = await getNextNumericId({ collection: 'users', counterDocId: 'users' });
      userDocRef = db.collection('users').doc(String(id));
      await userDocRef.set(
        {
          id,
          email,
          password: '',
          name,
          role: 'artist',
          status: 'onboarding',
          balance: 0,
          google_id: googleId,
          profile_image: profileImage,
          created_at: new Date().toISOString()
        },
        { merge: false }
      );
    }

    const finalSnap = await userDocRef.get();
    const user = finalSnap.exists ? finalSnap.data() || {} : {};
    delete user.password;
    return sendPopup({ type: 'OAUTH_AUTH_SUCCESS', user });
  } catch (e) {
    return sendPopup({ type: 'OAUTH_AUTH_ERROR', error: String(e?.message || 'Google login failed') });
  }
});

exports.api = functions.https.onRequest(apiApp);
