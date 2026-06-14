"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./expense-detail.module.css";

// Mock Data
const mockExpense = {
  id: "e1",
  groupId: "g1",
  groupName: "SE Asia Trip",
  description: "Airbnb Bangkok (4 nights)",
  amount: 450.00,
  date: "2026-06-12T14:30:00Z",
  category: "Lodging",
  categoryIcon: "🏠",
  color: "#B197FC",
  notes: "Paid for the first leg of the trip. Includes cleaning fee.",
  receiptUrl: null,
  payer: {
    id: "u1",
    name: "You",
    avatar: "Y",
    paidAmount: 450.00
  },
  splits: [
    { id: "u1", name: "You", avatar: "Y", owed: 112.50 },
    { id: "u2", name: "Sarah", avatar: "S", owed: 112.50 },
    { id: "u3", name: "Hamza", avatar: "H", owed: 112.50 },
    { id: "u4", name: "Ali", avatar: "A", owed: 112.50 },
  ]
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.expenseDetail}>
      
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/dashboard/groups/${mockExpense.groupId}`} className={styles.backBtn} aria-label="Back to group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <span className="text-secondary">{mockExpense.groupName}</span>
        </div>
        
        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Edit expense">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className={styles.iconBtn} aria-label="Delete expense" style={{ color: '#ff6b6b' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Receipt Card */}
      <main className={styles.receiptCard}>
        
        <div className={styles.receiptHeader}>
          <div className={styles.categoryIcon} style={{ backgroundColor: `${mockExpense.color}20`, color: mockExpense.color }}>
            {mockExpense.categoryIcon}
          </div>
          <h1 className={styles.expenseTitle}>{mockExpense.description}</h1>
          <div className={styles.expenseAmount}>
            ${mockExpense.amount.toFixed(2)}
          </div>
          <div className={styles.expenseMeta}>
            <span>{mockExpense.category}</span>
            <span className={styles.metaDot} />
            <span>{new Date(mockExpense.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className={styles.receiptBody}>
          
          {/* Splits */}
          <div>
            <h2 className={styles.sectionTitle}>Split Details</h2>
            <div className={styles.splitList}>
              
              {/* Payer */}
              <div className={`${styles.splitRow} ${styles.isPayer}`}>
                <div className={styles.splitUser}>
                  <div className={styles.avatar}>{mockExpense.payer.avatar}</div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{mockExpense.payer.name}</span>
                    <span className={styles.userRole}>Paid full amount</span>
                  </div>
                </div>
                <div className={styles.splitAmount}>
                  <span className={styles.amount}>${mockExpense.payer.paidAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Everyone Owed */}
              {mockExpense.splits.map((split) => (
                <div key={split.id} className={styles.splitRow}>
                  <div className={styles.splitUser}>
                    <div className={styles.avatar}>{split.avatar}</div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{split.name}</span>
                      <span className={styles.userRole}>Owes</span>
                    </div>
                  </div>
                  <div className={styles.splitAmount}>
                    <span className={styles.amount}>${split.owed.toFixed(2)}</span>
                    <span className={styles.amountType}>{(split.owed / mockExpense.amount * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
              
            </div>
          </div>

          {/* Notes & Receipt */}
          <div className={styles.extraDetails}>
            <div className={styles.detailBox}>
              <h2 className={styles.sectionTitle}>Notes</h2>
              {mockExpense.notes ? (
                <p className={styles.noteText}>{mockExpense.notes}</p>
              ) : (
                <p className="text-tertiary">No notes added.</p>
              )}
            </div>

            <div className={styles.detailBox}>
              <h2 className={styles.sectionTitle}>Receipt Image</h2>
              <button className={styles.receiptImageBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Upload Receipt
              </button>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
