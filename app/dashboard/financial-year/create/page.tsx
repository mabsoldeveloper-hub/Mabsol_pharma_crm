export default function CreateFYPage() {
    return (
      <div className="card shadow border-0">
        <div className="card-body">
  
          <h3>Create Financial Year</h3>
          <hr />
  
          <div className="row">
  
            <div className="col-md-6">
              <label>FY Name</label>
              <input
                className="form-control"
                placeholder="FY 2026-27"
              />
            </div>
  
            <div className="col-md-3">
              <label>Start Date</label>
              <input
                type="date"
                className="form-control"
              />
            </div>
  
            <div className="col-md-3">
              <label>End Date</label>
              <input
                type="date"
                className="form-control"
              />
            </div>
  
          </div>
  
          <button className="btn btn-primary mt-3">
            Save Financial Year
          </button>
  
        </div>
      </div>
    );
  }