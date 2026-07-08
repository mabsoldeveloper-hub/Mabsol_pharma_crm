export default function ProductOverview({ product }: any) {

    return (
  
      <div className="card shadow mt-3">
  
        <div className="card-header">
  
          Product Details
  
        </div>
  
        <div className="card-body">
  
          <p><b>Company :</b> {product.GCODE}</p>
  
          <p><b>MRP :</b> {product.MRP}</p>
  
          <p><b>Purchase :</b> {product.PRATE}</p>
  
          <p><b>Sale :</b> {product.RATEF}</p>
  
        </div>
  
      </div>
  
    );
  
  }