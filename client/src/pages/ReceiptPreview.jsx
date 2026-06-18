import React from 'react';
import BookingReceipt from '../components/BookingReceipt.jsx';

const mockBooking = {
  bookingRef: 'UE-2026-001',
  plotNumber: 'A-123',
  plotType: 'Residential',
  plotSize: '5 Marla',
  plotPrice: 2500000,
  downPayment: 500000,
  name: 'Muhammad Ali Khan',
  cnic: '37405-1234567-1',
  phone: '0992-123456',
  cell: '0300-1234567',
  postalAddress: 'House No. 5, Street 3, F-7/2, Islamabad',
  permanentAddress: 'Village Havelian, District Abbottabad, KPK',
  nomineeName: 'Fatima Ali Khan',
  nomineeRelation: 'Wife',
  nomineeCnic: '37405-7654321-2',
  nomineePhone: '0300-7654321',
  guardianName: 'Haji Abdul Rehman',
  paymentMode: 'Bank Transfer',
  bookingDate: new Date().toISOString(),
  plotTags: ['corner'],
  dealerName: 'Ahmed Real Estate',
  status: 'approved',
};

export default function ReceiptPreview({ navigate }) {
  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate('home')}
            style={{
              background: '#374151', color: '#fff', border: 'none',
              borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            ← Back to Home
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Receipt Preview (sample data)</span>
        </div>
        <BookingReceipt booking={mockBooking} onClose={() => navigate('home')} previewMode />
      </div>
    </div>
  );
}
