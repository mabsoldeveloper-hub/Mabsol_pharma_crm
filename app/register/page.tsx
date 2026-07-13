"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();


  const [name, setName] = useState("");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  
  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  
  const [emailSending, setEmailSending] = useState(false);
  const [mobileSending, setMobileSending] = useState(false);
  
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [mobileVerifying, setMobileVerifying] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    if (!emailVerified) {
      alert("Please verify your email first.");
      return;
    }
  
    if (!mobileVerified) {
      alert("Please verify your mobile number first.");
      return;
    }
  
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
  
    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
  
    try {
      setLoading(true);
  
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          mobile,
          password,
        }),
      });
  
      const data = await res.json();
  
      if (data.success) {
        alert("Registration Successful");
  
        router.push("/login");
      } else {
        alert(data.message || "Registration Failed");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  

  const sendEmailOTP = async () => {

    if (!email) {
      alert("Enter Email");
      return;
    }
  
    setEmailSending(true);
  
    try {
  
      const res = await fetch(
        "/api/auth/send-email-otp",
        {
          method: "POST",
  
          headers: {
            "Content-Type": "application/json",
          },
  
          body: JSON.stringify({
            email,
          }),
        }
      );
  
      const data = await res.json();
  
      if (data.success) {
  
        setEmailOtpSent(true);
  
        alert("OTP Sent Successfully");
  
      } else {
  
        alert(data.message);
  
      }
  
    } catch {
  
      alert("Something went wrong");
  
    } finally {
  
      setEmailSending(false);
  
    }
  
  };


  
  const verifyEmailOTP = async () => {

    if (!emailOtp) {
      alert("Enter Email OTP");
      return;
    }
  
    setEmailVerifying(true);
  
    try {
  
      const res = await fetch(
        "/api/auth/verify-email-otp",
        {
          method: "POST",
  
          headers: {
            "Content-Type": "application/json",
          },
  
          body: JSON.stringify({
            email,
            otp: emailOtp,
          }),
        }
      );
  
      const data = await res.json();
  
      if (data.success) {
  
        setEmailVerified(true);
  
        setEmailOtpSent(false);
  
        alert("Email Verified Successfully");
  
      } else {
  
        alert(data.message);
  
      }
  
    } catch (err) {
  
      alert("Something went wrong");
  
    } finally {
  
      setEmailVerifying(false);
  
    }
  
  };


  const sendMobileOTP = async () => {

    if (!mobile) {
      alert("Enter Mobile Number");
      return;
    }
  
    setMobileSending(true);
  
    try {
  
      const res = await fetch(
        "/api/auth/send-mobile-otp",
        {
          method: "POST",
  
          headers: {
            "Content-Type":
              "application/json",
          },
  
          body: JSON.stringify({
            mobile,
          }),
        }
      );
  
      const data = await res.json();
  
      if (data.success) {
  
        setMobileOtpSent(true);
  
        alert(
          "WhatsApp OTP Sent Successfully"
        );
  
      } else {
  
        alert(data.message);
  
      }
  
    } catch {
  
      alert("Something went wrong");
  
    } finally {
  
      setMobileSending(false);
  
    }
  
  };


  const verifyMobileOTP = async () => {

    if (!mobileOtp) {
      alert("Enter OTP");
      return;
    }
  
    setMobileVerifying(true);
  
    try {
  
      const res = await fetch(
        "/api/auth/verify-mobile-otp",
        {
          method: "POST",
  
          headers: {
            "Content-Type":
              "application/json",
          },
  
          body: JSON.stringify({
  
            mobile,
  
            otp: mobileOtp,
  
          }),
        }
      );
  
      const data = await res.json();
  
      if (data.success) {
  
        setMobileVerified(true);
  
        setMobileOtpSent(false);
  
        alert(
          "Mobile Verified Successfully"
        );
  
      } else {
  
        alert(data.message);
  
      }
  
    } catch {
  
      alert("Something went wrong");
  
    } finally {
  
      setMobileVerifying(false);
  
    }
  
  };


  return (
    <div className="container-fluid vh-100 p-0">
      <div className="row g-0 h-100">

        {/* Left Side */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center bg-light">

          <div
            className="card shadow-lg border-0 p-4"
            style={{
              width: "420px",
              borderRadius: "20px",
            }}
          >
            <div className="text-center mb-4">

            <div className="flex justify-center">
                  <Image src="/mabsol_logo.ico" alt="Logo" width={100} height={100} />
              </div>

              <h3 className="mt-3">
                Mabsol Pharma CRM
              </h3>

              <p className="text-muted">
                Create New Account
              </p>
            </div>

            <form onSubmit={handleRegister}>

              <div className="mb-3">
                <label className="form-label">
                  Full Name
                </label>

                <input
  type="text"
  className="form-control"
  placeholder="Enter Name"
  value={name}
  minLength={3}
  onChange={(e) => setName(e.target.value)}
  required
/>
              </div>

              <div className="mb-3">

<label className="form-label">
Email Address
</label>

<div className="input-group">

<input
type="email"
className="form-control"
placeholder="Enter Email"
value={email}
disabled={emailVerified}
onChange={(e)=>setEmail(e.target.value)}
required
/>

<button
type="button"
className={`btn ${emailVerified?"btn-success":"btn-primary"}`}
disabled={emailVerified || emailSending}
onClick={sendEmailOTP}
>
{
emailVerified
?
"Verified"
:
emailSending
?
"Sending..."
:
"Verify"
}
</button>

</div>

</div>

{
emailOtpSent &&
!emailVerified &&

<div className="mb-3">

<label>
Email OTP
</label>

<div className="input-group">

<input
className="form-control"
placeholder="Enter Email OTP"
value={emailOtp}
onChange={(e)=>setEmailOtp(e.target.value)}
/>

<button
type="button"
className="btn btn-success"
onClick={verifyEmailOTP}
disabled={emailVerifying}
>
{
emailVerifying
?
"Verifying..."
:
"Verify"
}
</button>

</div>

</div>

}



{
emailVerified &&

<div className="alert alert-success py-2">

✓ Email Verified Successfully

</div>

}




<div className="mb-3">

<label>
Mobile Number
</label>

<div className="input-group">

<input
  type="tel"
  className="form-control"
  placeholder="Enter Mobile"
  value={mobile}
  maxLength={10}
  pattern="[0-9]{10}"
  disabled={!emailVerified || mobileVerified}
  onChange={(e) =>
    setMobile(e.target.value.replace(/\D/g, ""))
  }
  required
/>

<button
type="button"
className={`btn ${mobileVerified?"btn-success":"btn-primary"}`}
disabled={!emailVerified || mobileVerified || mobileSending}
onClick={sendMobileOTP}
>

{
mobileVerified
?
"Verified"
:
mobileSending
?
"Sending..."
:
"Verify"
}

</button>

</div>

</div>

{
mobileOtpSent &&
!mobileVerified &&

<div className="mb-3">

<label>

WhatsApp OTP

</label>

<div className="input-group">

<input
className="form-control"
placeholder="Enter WhatsApp OTP"
value={mobileOtp}
onChange={(e)=>setMobileOtp(e.target.value)}
/>

<button
type="button"
className="btn btn-success"
disabled={mobileVerifying}
onClick={verifyMobileOTP}
>

{
mobileVerifying
?
"Verifying..."
:
"Verify"
}

</button>

</div>

</div>

}

{
mobileVerified &&

<div className="alert alert-success py-2">

✓ Mobile Verified Successfully

</div>

}


              <div className="mb-3">
                <label className="form-label">
                  Password
                </label>

                <input
type="password"
className="form-control"
placeholder="Password"
value={password}
disabled={!mobileVerified}
onChange={(e)=>setPassword(e.target.value)}
/>
              </div>


              <div className="mb-3">
                <label className="form-label">
                Confirm  Password
                </label>

                <input
type="password"
className="form-control mt-3"
placeholder="Confirm Password"
value={confirmPassword}
disabled={!mobileVerified}
onChange={(e)=>setConfirmPassword(e.target.value)}
/>
              </div>



              <button
type="submit"
className="btn btn-success w-100 mt-3"
disabled={
!emailVerified ||
!mobileVerified ||
loading
}
>

{
loading
?
"Creating..."
:
"Create Account"
}

</button>

              <button
                type="button"
                className="btn btn-outline-primary w-100 mt-2"
                onClick={() =>
                  router.push("/login")
                }
              >
                Back To Login
              </button>

            </form>

          </div>

        </div>

        {/* Right Side */}
        <div className="col-lg-6 d-none d-lg-block position-relative">

          <Image
            src="/2.jpg"
            alt="Background"
            fill
            sizes="50vw"
            style={{
              objectFit: "cover",
            }}
          />

          <div className="position-absolute bottom-0 start-0 p-5 text-white">
            <h2>
              Welcome To Mabsol CRM
            </h2>

            <p>
              Manage Leads, Customers,
              Invoices, Employees and
              Business Operations Easily.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
