"use client";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function AnalyticsCards({ analytics }: { analytics: any }) {
    const cards = [
        { title: "Average Invoice Value", value: formatCurrency(analytics?.avgInvoiceValue) },
        { title: "Average Daily Sales", value: formatCurrency(analytics?.avgDailySales) },
        { title: "Average Customer Sale", value: formatCurrency(analytics?.avgCustomerSale) },
        { title: "Stock Value", value: formatCurrency(analytics?.stockValue) },
        { title: "Expired Stock Value", value: formatCurrency(analytics?.expiredStockValue) },
        { title: "Near Expiry Stock Value", value: formatCurrency(analytics?.nearExpiryStockValue) },
        { title: "Gross Estimated Margin", value: formatCurrency(analytics?.grossMargin) },
        { title: "Collection Efficiency", value: `${(analytics?.collectionEfficiency ?? 0).toFixed(1)}%` },
    ];

    return (
        <>
            <style jsx>{`
        .analytics-card {
          background: #fff;
          border-radius: 14px;
          min-height: 90px;
          border-left: 4px solid #fb8c00;
        }
        .analytics-title {
          font-size: 12px;
          color: #888;
          margin-bottom: 6px;
        }
        .analytics-value {
          font-size: 20px;
          font-weight: 700;
          color: #343872;
          margin: 0;
        }
      `}</style>

            <div className="row g-3">
                {cards.map((card, i) => (
                    <div className="col-xl-3 col-lg-4 col-md-6 col-12" key={i}>
                        <div className="card border-0 shadow-sm analytics-card">
                            <div className="card-body p-3">
                                <div className="analytics-title">{card.title}</div>
                                <h4 className="analytics-value">{card.value}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}