export const VoucherTypes = {
    S: {
      title: "Sales Invoice",
      color: "primary",
    },
  
    P: {
      title: "Purchase Invoice",
      color: "success",
    },
  
    R: {
      title: "Sales Return (Credit Note)",
      color: "warning",
    },
  
    B: {
      title: "Purchase Return (Debit Note)",
      color: "danger",
    },
  
    W: {
      title: "Sales Return (Break / Expiry)",
      color: "warning",
    },
  
    Q: {
      title: "Purchase Return (Break / Expiry)",
      color: "danger",
    },
  
    U: {
      title: "Price Difference Debit Note",
      color: "danger",
    },
  
    u: {
      title: "Price Difference Credit Note",
      color: "warning",
    },
  
    T: {
      title: "Purchase Price Difference Debit Note",
      color: "danger",
    },
  
    t: {
      title: "Purchase Price Difference Credit Note",
      color: "warning",
    },
  
    J: {
      title: "Journal Voucher",
      color: "secondary",
    },
  } as const;