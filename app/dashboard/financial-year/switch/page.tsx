export default function SwitchFYPage() {
    return (
      <div className="card shadow border-0">
        <div className="card-body">
  
          <h3>Switch Financial Year</h3>
          <hr />
  
          <div className="col-md-4">
  
            <label>Select Financial Year</label>
  
            <select className="form-control">
              <option>FY 2025-26</option>
              <option>FY 2026-27</option>
              <option>FY 2027-28</option>
            </select>
  
          </div>
  
          <button className="btn btn-success mt-3">
            Switch Financial Year
          </button>
  
        </div>
      </div>
    );
  }