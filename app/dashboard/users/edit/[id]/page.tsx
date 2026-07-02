"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditUserPage() {

  const { id } = useParams();

  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [companies, setCompanies] =
    useState<any[]>([]);

  const [roles, setRoles] =
    useState<any[]>([]);

  const [photoPreview, setPhotoPreview] =
    useState("/avatar.png");

  const [form, setForm] =
    useState({

      employeeCode: "",

      name: "",

      email: "",

      password: "",

      mobile: "",

      companyId: "",

      roleId: "",

      department: "",

      designation: "",

      gender: "",

      dob: "",

      joiningDate: "",

      address: "",

      city: "",

      state: "",

      country: "",

      pincode: "",

      status: "Active",

      profilePhoto: "",

    });

  useEffect(() => {

    loadCompanies();

    loadRoles();

    loadUser();

  }, []);

  // ------------------------
  // Company
  // ------------------------

  const loadCompanies = async () => {

    const res =
      await fetch("/api/company-master");

    const data =
      await res.json();

    setCompanies(data);

  };

  // ------------------------
  // Roles
  // ------------------------

  const loadRoles = async () => {

    const res =
      await fetch("/api/roles");

    const data =
      await res.json();

    setRoles(data);

  };

  // ------------------------
  // Load User
  // ------------------------

  const loadUser = async () => {

    const res =
      await fetch(`/api/users/${id}`);

    const data =
      await res.json();

    setForm({

      employeeCode:
        data.employeeCode || "",

      name:
        data.name || "",

      email:
        data.email || "",

      password: "",

      mobile:
        data.mobile || "",

      companyId:
        data.companyId?._id || "",

      roleId:
        data.roleId?._id || "",

      department:
        data.department || "",

      designation:
        data.designation || "",

      gender:
        data.gender || "",

      dob:
        data.dob
          ? data.dob.substring(0,10)
          : "",

      joiningDate:
        data.joiningDate
          ? data.joiningDate.substring(0,10)
          : "",

      address:
        data.address || "",

      city:
        data.city || "",

      state:
        data.state || "",

      country:
        data.country || "",

      pincode:
        data.pincode || "",

      status:
        data.status || "Active",

      profilePhoto:
        data.profilePhoto || "",

    });

    if(data.profilePhoto){

      setPhotoPreview(
        data.profilePhoto
      );

    }

  };

  // ------------------------
  // Update
  // ------------------------

  const updateUser = async () => {

    try{

      setLoading(true);

      const res =
        await fetch(`/api/users/${id}`,{

          method:"PUT",

          headers:{
            "Content-Type":
            "application/json",
          },

          body:JSON.stringify(form),

        });

      const data =
        await res.json();

      if(!res.ok){

        alert(data.error);

        return;

      }

      alert("User Updated Successfully");

      router.push(
        "/dashboard/users"
      );

    }catch{

      alert("Update Failed");

    }finally{

      setLoading(false);

    }

  };

  return (

    <div className="card shadow border-0">
    
    <div className="card-body">
    
    <h3>Edit User</h3>
    
    <hr/>
    
    <div className="row g-3">
    
    {/* Profile */}
    
    <div className="col-md-12 text-center">
    
    <img
    src={photoPreview}
    alt="Profile"
    width={120}
    height={120}
    style={{
    borderRadius:"50%",
    objectFit:"cover",
    border:"2px solid #ddd",
    padding:"5px",
    }}
    />
    
    <div className="mt-3">
    
    <input
    type="file"
    className="form-control"
    onChange={(e)=>{
    
    const file=e.target.files?.[0];
    
    if(file){
    
    const url=
    URL.createObjectURL(file);
    
    setPhotoPreview(url);
    
    setForm({
    
    ...form,
    
    profilePhoto:url,
    
    });
    
    }
    
    }}
    />
    
    </div>
    
    </div>
    
    {/* Employee Code */}
    
    <div className="col-md-4">
    
    <label>Employee Code</label>
    
    <input
    className="form-control"
    value={form.employeeCode}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    employeeCode:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Name */}
    
    <div className="col-md-8">
    
    <label>Full Name</label>
    
    <input
    className="form-control"
    value={form.name}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    name:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Email */}
    
    <div className="col-md-6">
    
    <label>Email</label>
    
    <input
    type="email"
    className="form-control"
    value={form.email}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    email:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Password */}
    
    <div className="col-md-6">
    
    <label>Change Password</label>
    
    <input
    type="password"
    className="form-control"
    placeholder="Leave Blank if No Change"
    value={form.password}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    password:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Mobile */}
    
    <div className="col-md-6">
    
    <label>Mobile</label>
    
    <input
    className="form-control"
    value={form.mobile}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    mobile:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Company */}
    
    <div className="col-md-6">
    
    <label>Company</label>
    
    <select
    className="form-control"
    value={form.companyId}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    companyId:e.target.value,
    
    })
    
    }
    >
    
    <option value="">
    Select Company
    </option>
    
    {
    
    companies.map((company)=>(
    
    <option
    key={company._id}
    value={company._id}
    >
    
    {company.companyName}
    
    </option>
    
    ))
    
    }
    
    </select>
    
    </div>
    
    {/* Role */}
    
    <div className="col-md-6">
    
    <label>Role</label>
    
    <select
    className="form-control"
    value={form.roleId}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    roleId:e.target.value,
    
    })
    
    }
    >
    
    <option value="">
    Select Role
    </option>
    
    {
    
    roles.map((role)=>(
    
    <option
    key={role._id}
    value={role._id}
    >
    
    {role.roleName}
    
    </option>
    
    ))
    
    }
    
    </select>
    
    </div>
    
    {/* Department */}
    
    <div className="col-md-6">
    
    <label>Department</label>
    
    <input
    className="form-control"
    value={form.department}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    department:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Designation */}
    
    <div className="col-md-6">
    
    <label>Designation</label>
    
    <input
    className="form-control"
    value={form.designation}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    designation:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Gender */}
    
    <div className="col-md-4">
    
    <label>Gender</label>
    
    <select
    className="form-control"
    value={form.gender}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    gender:e.target.value,
    
    })
    
    }
    >
    
    <option value="">Select</option>
    
    <option>Male</option>
    
    <option>Female</option>
    
    <option>Other</option>
    
    </select>
    
    </div>
    
    {/* DOB */}
    
    <div className="col-md-4">
    
    <label>Date of Birth</label>
    
    <input
    type="date"
    className="form-control"
    value={form.dob}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    dob:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Joining */}
    
    <div className="col-md-4">
    
    <label>Joining Date</label>
    
    <input
    type="date"
    className="form-control"
    value={form.joiningDate}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    joiningDate:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Address */}
    
    <div className="col-md-12">
    
    <label>Address</label>
    
    <textarea
    rows={3}
    className="form-control"
    value={form.address}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    address:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-3">
    
    <label>City</label>
    
    <input
    className="form-control"
    value={form.city}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    city:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-3">
    
    <label>State</label>
    
    <input
    className="form-control"
    value={form.state}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    state:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-3">
    
    <label>Country</label>
    
    <input
    className="form-control"
    value={form.country}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    country:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-3">
    
    <label>Pincode</label>
    
    <input
    className="form-control"
    value={form.pincode}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    pincode:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-4">
    
    <label>Status</label>
    
    <select
    className="form-control"
    value={form.status}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    status:e.target.value,
    
    })
    
    }
    >
    
    <option>Active</option>
    
    <option>Inactive</option>
    
    </select>
    
    </div>
    
    </div>

    <div className="mt-4 d-flex gap-2">

  <button
    className="btn btn-primary"
    disabled={loading}
    onClick={updateUser}
  >
    {
      loading
        ? "Updating..."
        : "Update User"
    }
  </button>

  <button
    className="btn btn-warning"
    onClick={() => {

      loadUser();

    }}
  >
    Reset
  </button>

  <button
    className="btn btn-secondary"
    onClick={() =>
      router.push(
        "/dashboard/users"
      )
    }
  >
    Back
  </button>

</div>

</div>

</div>

);

}