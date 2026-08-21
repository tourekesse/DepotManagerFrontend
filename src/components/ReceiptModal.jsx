import React, { useContext } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useReceiptModal } from '../contexts/ReceiptModalContext'

export default function ReceiptModal() {
  const { state, closeReceipt } = useReceiptModal()
  const { pdfUrl, caption, open } = state
  if (!open) return null
  return (
    <Dialog open={true} onClose={closeReceipt} fullWidth maxWidth="md" aria-label="Receipt dialog">
      <DialogTitle>
        {caption}
        <IconButton aria-label="close" onClick={closeReceipt} style={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0, height: '80vh' }}>
        {pdfUrl ? (
          <iframe src={pdfUrl} title="Reçu" style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : (
          <div style={{ padding: 20 }}>Chargement du reçu...</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
