import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#111827' },
  watermarkSuccess: { position: 'absolute', top: 300, left: 20, transform: 'rotate(-45deg)', fontSize: 60, color: 'rgba(16, 185, 129, 0.05)', fontFamily: 'Helvetica-Bold' },
  watermarkPending: { position: 'absolute', top: 300, left: 20, transform: 'rotate(-45deg)', fontSize: 60, color: 'rgba(0, 0, 0, 0.05)', fontFamily: 'Helvetica-Bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingBottom: 20, marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { width: 60, height: 60, marginRight: 15, objectFit: 'contain' },
  defaultLogo: { width: 60, height: 60, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderRadius: 4 },
  defaultLogoText: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  schoolInfo: { justifyContent: 'center' },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  contactInfo: { fontSize: 10, color: '#6b7280', width: 250, lineHeight: 1.4 },
  headerRight: { alignItems: 'flex-end' },
  documentTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#e5e7eb', marginBottom: 10, letterSpacing: 2 },
  infoRow: { flexDirection: 'row', marginBottom: 4, width: '100%', justifyContent: 'flex-end' },
  infoLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4b5563', width: 75, textAlign: 'right', marginRight: 10 },
  infoValue: { fontSize: 10, color: '#111827', width: 90, textAlign: 'left' },
  
  statusBannerSuccess: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#d1fae5' },
  statusBannerPending: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', padding: 12, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#fef3c7' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDotSuccess: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  statusDotPending: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', marginRight: 8 },
  statusTextSuccess: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#047857' },
  statusTextPending: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#b45309' },
  statusAmount: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },

  detailsGrid: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 20 },
  detailsCol: { flex: 1 },
  detailsTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6b7280', width: 90 },
  detailValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },

  amountContainer: { backgroundColor: '#f9fafb', padding: 20, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#4b5563' },
  amountValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827' },
  remarksContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  remarksLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  remarksText: { fontSize: 10, color: '#374151' },

  footer: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 15, marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between' },
  termsContainer: { flex: 1 },
  termsTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', marginBottom: 4 },
  termsText: { fontSize: 8, color: '#9ca3af', lineHeight: 1.4 },
  qrContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  qrCode: { width: 40, height: 40, marginRight: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  qrTextContainer: { justifyContent: 'center' },
  qrTextTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase' },
  qrTextSub: { fontSize: 8, color: '#9ca3af' },
});

const PaymentReceiptDocument = ({ data, qrUrl }) => {
  if (!data) return null;

  const {
    receiptNumber,
    amount,
    paymentMode,
    referenceNo,
    utr,
    paidAt,
    createdAt,
    remarks,
    status,
    invoice,
    school
  } = data;

  const student = invoice?.student;
  const isSuccess = status === 'SUCCESS';
  
  const statusText = isSuccess ? 'PAYMENT SUCCESSFUL' : status.replace('_', ' ');

  const formatAmount = (amt) => `Rs. ${(amt / 100).toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={isSuccess ? styles.watermarkSuccess : styles.watermarkPending}>{statusText}</Text>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {school?.settings?.logoUrl ? (
              <Image src={school.settings.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.defaultLogo}>
                <Text style={styles.defaultLogoText}>{school?.name?.charAt(0) || 'S'}</Text>
              </View>
            )}
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{school?.name || 'School Name'}</Text>
              {school?.settings?.contactInfo && (
                <Text style={styles.contactInfo}>{school.settings.contactInfo}</Text>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>PAYMENT RECEIPT</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Receipt No:</Text>
              <Text style={styles.infoValue}>{receiptNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Generated On:</Text>
              <Text style={styles.infoValue}>{new Date(createdAt).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice Ref:</Text>
              <Text style={styles.infoValue}>{invoice?.invoiceNumber || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={isSuccess ? styles.statusBannerSuccess : styles.statusBannerPending}>
          <View style={styles.statusLeft}>
            <View style={isSuccess ? styles.statusDotSuccess : styles.statusDotPending} />
            <Text style={isSuccess ? styles.statusTextSuccess : styles.statusTextPending}>{statusText}</Text>
          </View>
          <Text style={styles.statusAmount}>{formatAmount(amount)}</Text>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailsCol}>
            <Text style={styles.detailsTitle}>Received From</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Student Name:</Text>
              <Text style={styles.detailValue}>{student?.name || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Admission No:</Text>
              <Text style={styles.detailValue}>{student?.erpId || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Class/Sec:</Text>
              <Text style={styles.detailValue}>
                {student?.studentProfile?.section?.class?.name || ''} - {student?.studentProfile?.section?.name || ''}
              </Text>
            </View>
          </View>
          <View style={styles.detailsCol}>
            <Text style={styles.detailsTitle}>Payment Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Mode:</Text>
              <Text style={styles.detailValue}>{paymentMode || 'N/A'}</Text>
            </View>
            {(referenceNo || utr) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction Ref:</Text>
                <Text style={styles.detailValue}>{referenceNo || utr}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fee Category:</Text>
              <Text style={styles.detailValue}>Tuition Fee</Text>
            </View>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount Received</Text>
            <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
          </View>
          {remarks && (
            <View style={styles.remarksContainer}>
              <Text style={styles.remarksLabel}>Remarks:</Text>
              <Text style={styles.remarksText}>{remarks}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Thank you for your payment!</Text>
            <Text style={styles.termsText}>This receipt is electronically generated and is valid subject to the realization of the cheque/demand draft/online transfer.</Text>
            
            {qrUrl && (
              <View style={styles.qrContainer}>
                <Image src={qrUrl} style={styles.qrCode} />
                <View style={styles.qrTextContainer}>
                  <Text style={styles.qrTextTitle}>Scan to Verify</Text>
                  <Text style={styles.qrTextSub}>Authenticity of this document</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PaymentReceiptDocument;
