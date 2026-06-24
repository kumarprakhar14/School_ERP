import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#111827' },
  watermark: { position: 'absolute', top: 300, left: 100, transform: 'rotate(-45deg)', fontSize: 80, color: 'rgba(0,0,0,0.05)', fontFamily: 'Helvetica-Bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', paddingBottom: 20, marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { width: 60, height: 60, marginRight: 15, objectFit: 'contain' },
  defaultLogo: { width: 60, height: 60, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderRadius: 4 },
  defaultLogoText: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  schoolInfo: { justifyContent: 'center' },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  contactInfo: { fontSize: 10, color: '#6b7280', width: 250, lineHeight: 1.4 },
  headerRight: { alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#e5e7eb', marginBottom: 10, letterSpacing: 2 },
  infoRow: { flexDirection: 'row', marginBottom: 4, width: '100%', justifyContent: 'flex-end' },
  infoLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4b5563', width: 75, textAlign: 'right', marginRight: 10 },
  infoValue: { fontSize: 10, color: '#111827', width: 80, textAlign: 'left' },
  infoValueRed: { fontSize: 10, color: '#dc2626', width: 80, textAlign: 'left' },
  
  billedToContainer: { backgroundColor: '#f9fafb', padding: 15, borderRadius: 6, marginBottom: 20, borderWidth: 1, borderColor: '#f3f4f6' },
  billedToTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', marginBottom: 10 },
  gridLabel: { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  gridValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  
  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8 },
  tableHeaderCellLeft: { flex: 2, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4b5563', paddingLeft: 10 },
  tableHeaderCellCenter: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4b5563', textAlign: 'center' },
  tableHeaderCellRight: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#4b5563', textAlign: 'right', paddingRight: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 12 },
  tableCellDesc: { flex: 2, paddingLeft: 10 },
  descTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  descRemarks: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  tableCellPeriod: { flex: 1, fontSize: 10, color: '#4b5563', textAlign: 'center' },
  tableCellAmount: { flex: 1, fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right', paddingRight: 10 },

  summaryContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 30 },
  summaryBox: { width: '50%' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#4b5563' },
  summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  summaryRowPaid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryLabelPaid: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#059669' },
  summaryValuePaid: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#059669' },
  summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, backgroundColor: '#f9fafb', paddingHorizontal: 10, marginTop: 5, borderRadius: 4 },
  summaryLabelTotal: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827' },
  summaryValueTotal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },

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

const InvoiceDocument = ({ data, qrUrl }) => {
  if (!data) return null;

  const {
    invoiceNumber,
    month,
    year,
    totalAmount,
    dueDate,
    createdAt,
    remarks,
    student,
    school,
    payments
  } = data;

  const paidAmount = payments?.reduce((sum, p) => p.status === 'SUCCESS' ? sum + p.amount : sum, 0) || 0;
  const balanceDue = totalAmount - paidAmount;
  const isPaid = balanceDue <= 0;
  
  const statusText = isPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY PAID' : 'PENDING');
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const feeMonth = monthNames[month - 1] || month;

  const formatAmount = (amt) => `Rs. ${(amt / 100).toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>{statusText}</Text>
        
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
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Invoice No:</Text>
              <Text style={styles.infoValue}>{invoiceNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Generated On:</Text>
              <Text style={styles.infoValue}>{new Date(createdAt).toLocaleString('en-IN')}</Text>
            </View>
            {dueDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Due Date:</Text>
                <Text style={styles.infoValueRed}>{new Date(dueDate).toLocaleDateString('en-IN')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.billedToContainer}>
          <Text style={styles.billedToTitle}>Billed To</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Student Name</Text>
              <Text style={styles.gridValue}>{student?.name || 'N/A'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Admission No</Text>
              <Text style={styles.gridValue}>{student?.erpId || 'N/A'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Class & Section</Text>
              <Text style={styles.gridValue}>
                {student?.studentProfile?.section?.class?.name || ''} - {student?.studentProfile?.section?.name || ''}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Contact</Text>
              <Text style={styles.gridValue}>{student?.contactDetails || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCellLeft}>Description</Text>
            <Text style={styles.tableHeaderCellCenter}>Period</Text>
            <Text style={styles.tableHeaderCellRight}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.tableCellDesc}>
              <Text style={styles.descTitle}>Tuition Fee</Text>
              {remarks && <Text style={styles.descRemarks}>{remarks}</Text>}
            </View>
            <Text style={styles.tableCellPeriod}>{feeMonth} {year}</Text>
            <Text style={styles.tableCellAmount}>{formatAmount(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalAmount)}</Text>
            </View>
            <View style={styles.summaryRowPaid}>
              <Text style={styles.summaryLabelPaid}>Paid Amount:</Text>
              <Text style={styles.summaryValuePaid}>-{formatAmount(paidAmount)}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>Balance Due:</Text>
              <Text style={styles.summaryValueTotal}>{formatAmount(balanceDue > 0 ? balanceDue : 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Terms & Conditions:</Text>
            <Text style={styles.termsText}>1. Please clear all dues before the due date to avoid late fees.</Text>
            <Text style={styles.termsText}>2. This is a computer-generated document and does not require a physical signature.</Text>
            
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

export default InvoiceDocument;
