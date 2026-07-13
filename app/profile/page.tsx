import Image from "next/image";

export default function ProfilePage() {
    return (
      <div className="container-fluid">
  
        <div className="card shadow border-0">
  
          <div className="card-body">
  
            <div className="text-center">
  
              <Image
                src="/mabsol_logo.ico"
                alt="profile"
                width={120}
                height={120}
                className="rounded-circle border"
              />
  
              <h3 className="mt-3">
                Company Admin
              </h3>
  
              <p className="text-muted">
                admin@mabsol.com
              </p>
  
            </div>
  
            <hr />
  
            <div className="row">
  
              <div className="col-md-6">
                <label>Name</label>
  
                <input
                  className="form-control"
                  defaultValue="Company Admin"
                />
              </div>
  
              <div className="col-md-6">
                <label>Email</label>
  
                <input
                  className="form-control"
                  defaultValue="admin@mabsol.com"
                />
              </div>
  
            </div>
  
            <button className="btn btn-primary mt-3">
              Update Profile
            </button>
  
          </div>
  
        </div>
  
      </div>
    );
  }
