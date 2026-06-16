async function getUsers() {
    const res = await fetch(
      "http://localhost:3000/api/users",
      {
        cache: "no-store",
      }
    );
  
    return res.json();
  }
  
  export default async function UsersPage() {
    const data = await getUsers();
  
    return (
      <div>
        <h1>Users List</h1>
  
        {data.users?.map(
          (user: any) => (
            <div
              key={user._id}
              style={{
                border:
                  "1px solid #ccc",
                padding: "10px",
                marginBottom:
                  "10px",
              }}
            >
              <h3>{user.name}</h3>
  
              <p>{user.email}</p>
  
              <p>{user.role}</p>
            </div>
          )
        )}
      </div>
    );
  }