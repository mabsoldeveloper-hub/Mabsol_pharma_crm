export default function ProfilePage() {
    return (
      <div className="container-fluid">
  
        <div className="card shadow border-0">
  
          <div className="card-body">
  
            <div className="text-center">
            <div className="flex justify-center">
                  <img src="/admin.jpg" alt="profile"
                width="120"
                className="rounded-circle border" />
              </div>

              <h3 className="mt-3">
                Admin
              </h3>
  
              <p className="text-muted">
                admin@mabsol.com
              </p>
  
            </div>
  
            <hr />
  
            <div className="row g-3">

  <div className="col-md-6">
    <label>Full Name</label>
    <input className="form-control" defaultValue="Company Admin" />
  </div>

  <div className="col-md-6">
    <label>Email</label>
    <input className="form-control" defaultValue="admin@mabsol.com" />
  </div>

  

  <div className="col-md-6">
    <label>Mobile</label>
    <input className="form-control" placeholder="Mobile Number" />
  </div>

  <div className="col-md-6">
    <label>Designation</label>
    <input className="form-control" placeholder="Manager" />
  </div>

  <div className="col-md-6">
    <label>Employee Code</label>
    <input className="form-control" placeholder="Employee Code" />
  </div>

  <div className="col-md-6">
    <label>Date Of Joining</label>
    <input type="date"  className="form-control" placeholder="Date Of Joining" />
  </div>

  <div className="col-md-6">
    <label>Department</label>
    <input className="form-control" placeholder="Sales" />
  </div>

  <div className="col-md-6">
    <label>Date Of Birth</label>
    <input type="date" className="form-control" />
  </div>

  <div className="col-md-12">
    <label>Address</label>
    <textarea className="form-control" rows={3} />
  </div>

  <div className="col-md-6">
    <label>State</label>
    <input className="form-control" placeholder="State" />
  </div>

  <div className="col-md-6">
    <label>Pincode</label>
    <input className="form-control" placeholder="Pincode" />
  </div>

  <div className="col-md-6">
    <label>Country</label>
    <input className="form-control" placeholder="Country" />
  </div>

  

  <div className="col-md-6">
    <label>Upload Profile Photo</label>
    <input type="file" className="form-control" />
  </div>


</div>
  
<button
  className="btn btn-primary mt-4"
>
  Update Profile
</button>
  
          </div>
  
        </div>
  
      </div>
    );
  }