import React, { createContext, useContext, useState } from 'react'
import ReceiptModal from '../components/ReceiptModal'

export const ReceiptModalContext = createContext(null)

export const ReceiptModalProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, pdfUrl: null, caption: '' })

  const openReceipt = (pdfUrl, caption) => setState({ open: true, pdfUrl, caption })
  const closeReceipt = () => setState({ open: false, pdfUrl: null, caption: '' })

  return (
    <ReceiptModalContext.Provider value={{ state, openReceipt, closeReceipt }}>
      {children}
      <ReceiptModal />
    </ReceiptModalContext.Provider>
  )
}

export const useReceiptModal = () => useContext(ReceiptModalContext)

// ReceiptModal is rendered here to be available globally
