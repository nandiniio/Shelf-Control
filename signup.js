// console.log("Signup JS loaded");

// document.getElementById("signupForm").addEventListener("submit", async function(e){

//     console.log("Signup button clicked");

// e.preventDefault();

// const username = document.getElementById("username").value;
// const email = document.getElementById("email").value;
// const password = document.getElementById("password").value;

// try {

// const response = await fetch("https://shelf-control-dgex.onrender.com/signup", {

// method: "POST",
// headers: {
// "Content-Type": "application/json"
// },

// body: JSON.stringify({
// username,
// email,
// password
// })

// });

// const data = await response.json();

// alert(data.message);

// if(data.message === "Signup successful"){
// window.location.href = "login.html";
// }

// } catch(error){

// console.error("Signup error:", error);

// }

// });

const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.querySelector("input[type='text']").value;
  const email = document.querySelector("input[type='email']").value;
  const password = document.querySelector("input[type='password']").value;

  try {
    const res = await fetch("https://shelf-control-dgex.onrender.com/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    console.log("RESPONSE:", data); // 👈 IMPORTANT DEBUG

    alert(data.message || "Something went wrong");

  } catch (err) {
    console.log("ERROR:", err);
    alert("Signup failed");
  }
});