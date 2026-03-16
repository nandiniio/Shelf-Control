document.getElementById("loginForm").addEventListener("submit", async function(e){

e.preventDefault();

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

const response = await fetch("http://localhost:3000/login",{

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