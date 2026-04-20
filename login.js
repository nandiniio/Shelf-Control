document.getElementById("loginForm").addEventListener("submit", async function(e){

e.preventDefault();
console.log("Login clicked");

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

// fetch("https://shelf-control-dgex.onrender.com/login")

const response = await fetch("https://shelf-control-dgex.onrender.com/login",{

method: "POST",
headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({
email,
password
})

});

const data = await response.json();

alert(data.message);

if(data.message === "Login successful"){

localStorage.setItem("userId", data.userId);
localStorage.setItem("username", data.username);
localStorage.setItem("email", data.email);

window.location.href = "landing.html";

}

});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("LOGIN BODY:", req.body); 

    const user = await User.findOne({ email });

    console.log("FOUND USER:", user); 

    if (!user) {
      return res.json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ message: "Incorrect password" });
    }

    res.json({
      message: "Login successful",
      userId: user._id,
      username: user.username,
      email: user.email
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

fetch("https://shelf-control-dgex.onrender.com/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
  console.log(data);
  alert(data.message);

  if (data.message === "Login successful") {
    window.location.href = "index.html";
  }
});

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault(); // 🚨 VERY IMPORTANT

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("Sending:", email, password); // debug

  const res = await fetch("https://shelf-control-dgex.onrender.com/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: email,
      password: password
    })
  });

  const data = await res.json();

  console.log("Response:", data);

  alert(data.message);

  if (data.message === "Login successful") {
    window.location.href = "index.html";
  }
});

console.log("LOGIN BODY:", req.body);
console.log("FOUND USER:", user);