export default function ProductHeader({ product }: any) {

    return (
  
      <div className="card shadow mb-3">
  
        <div className="card-body">
  
          <h2>{product.PRODUCT}</h2>
  
          <p>Code : {product.CODE}</p>
  
        </div>
  
      </div>
  
    );
  
  }