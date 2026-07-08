export default function ProductSummaryCards({ product }: any) {

    return (
  
      <div className="row mb-3">
  
        <div className="col-md-3">
  
          <div className="card">
  
            <div className="card-body">
  
              <h6>Stock</h6>
  
              <h3>{product.BALANCE}</h3>
  
            </div>
  
          </div>
  
        </div>
  
      </div>
  
    );
  
  }