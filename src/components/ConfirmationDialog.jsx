import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import '../common/DataTable.css';
import { useT } from '../context/PrefsContext';

const ConfirmationDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    messageSecond,
    cancelLabel,
    confirmLabel,
    titleClassName,  
    contentClassName, 
    confirmClassName, 
    cancelClassName,
    confirmColor,
}) => {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle className={titleClassName}>{t(title)}</DialogTitle>
      <DialogContent className={contentClassName}>
        <Typography variant="body1">{t(message)}</Typography>
        <Typography variant="body1" className='associated-message'>{messageSecond}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary" className={cancelClassName}>
          {t(cancelLabel)}
        </Button>
        <Button onClick={onConfirm} variant="outlined" color={confirmColor || 'error'} className={confirmClassName}>
          {t(confirmLabel)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;