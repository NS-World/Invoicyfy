import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from '@mui/material';
import '../common/DataTable.css';

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
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle className={titleClassName}>{title}</DialogTitle>
      <DialogContent className={contentClassName}>
        <Typography variant="body1">{message}</Typography>
        <Typography variant="body1" className='associated-message'>{messageSecond}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary" className={cancelClassName}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="outlined" color={confirmColor || 'error'} className={confirmClassName}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;