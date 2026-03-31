// ==============================
// API URL
// ==============================

const API_URL = "https://shelf-control-dgex.onrender.com/books";


// ==============================
// LOGIN PROTECTION
// ==============================

const userId = localStorage.getItem("userId");

const currentPage = window.location.pathname;

if (!userId && !currentPage.includes("login.html") && !currentPage.includes("signup.html")) {
    window.location.href = "login.html";
}


// ==============================
// LOAD LISTS (Landing Page)
// ==============================

async function loadLists() {

    const container = document.querySelector(".lists-container");
    if (!container) return;

    try {

        const response = await fetch(`${API_URL}?userId=${userId}`);
        const books = await response.json();

        const lists = {};

        books.forEach(book => {

            const listName = book.list || "Uncategorized";

            if (!lists[listName]) {
                lists[listName] = 0;
            }

            lists[listName]++;

        });

        container.innerHTML = "";

        Object.keys(lists).forEach(listName => {

            const card = document.createElement("div");
            card.className = "list-card";

            card.innerHTML = `
                <h3>${listName}</h3>
                <p>${lists[listName]} Books</p>
            `;

            card.addEventListener("click", () => {
                openList(listName);
            });

            container.appendChild(card);

        });

    } catch (error) {
        console.error("Error loading lists:", error);
    }

}


// ==============================
// OPEN LIST PAGE
// ==============================

function openList(listName) {
    window.location.href = "list.html?list=" + encodeURIComponent(listName);
}


// ==============================
// OPEN STATUS LIST
// ==============================

function openStatusList(status){
    window.location.href = "list.html?status=" + encodeURIComponent(status);
}


// ==============================
// LOAD BOOKS IN LIST PAGE
// ==============================

async function loadListBooks() {

    const params = new URLSearchParams(window.location.search);
    const listName = params.get("list");
    const status = params.get("status");

    const title = document.getElementById("listTitle");
    const container = document.getElementById("bookContainer");

    if (!title || !container) return;

    try {

        const response = await fetch(`${API_URL}?userId=${userId}`);
        const books = await response.json();

        let filtered = [];

        if (listName) {

            title.textContent = listName + " Books";

            filtered = books.filter(book => book.list === listName);

        }

        else if (status) {

            title.textContent = status + " Books";

            filtered = books.filter(book => book.status === status);

        }

        container.innerHTML = "";

        filtered.forEach(book => {

            const card = document.createElement("div");
            card.className = "book-card";

            card.innerHTML = `
<div class="book-card-layout">

<img src="${book.image}" class="book-cover">

<div class="book-info">
<h3>${book.title}</h3>
<p>Author: ${book.author}</p>
<p>Status: ${book.status}</p>
</div>

</div>
`;

            card.addEventListener("click", () => {
                window.location.href = "book.html?id=" + book._id;
            });

            container.appendChild(card);

        });

    } catch (error) {

        console.error("Error loading books:", error);

    }

}


// ==============================
// LOAD BOOK DETAILS
// ==============================

async function loadBookDetails(){

const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

if(!bookId) return;

try{

const response = await fetch(`${API_URL}?userId=${userId}`);
const books = await response.json();

const book = books.find(b => b._id === bookId);
if(!book) return;

document.getElementById("bookImage").src = book.image;
document.getElementById("bookTitle").textContent = book.title;
document.getElementById("bookAuthor").textContent = "Author: " + book.author;
document.getElementById("bookStatus").textContent = "Status: " + book.status;
document.getElementById("bookReview").textContent = "Review: " + book.review;


// DELETE BUTTON
const deleteBtn = document.getElementById("deleteBtn");

if(deleteBtn){
deleteBtn.addEventListener("click", () => {

if(confirm("Delete this book?")){
deleteBook(bookId);
}

});
}


// EDIT BUTTON
const editBtn = document.getElementById("editBtn");

if(editBtn){
editBtn.addEventListener("click", () => {
window.location.href = "editbook.html?id=" + bookId;
});
}

}
catch(error){
console.error("Error loading book:", error);
}

}


// ==============================
// LOAD EDIT BOOK PAGE
// ==============================

async function loadEditBook(){

const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

const form = document.getElementById("editBookForm");

if(!bookId || !form) return;

const response = await fetch(`${API_URL}?userId=${userId}`);
const books = await response.json();

const book = books.find(b => b._id === bookId);

document.getElementById("title").value = book.title;
document.getElementById("author").value = book.author;
document.getElementById("image").value = book.image;
document.getElementById("review").value = book.review;
document.getElementById("status").value = book.status;

form.addEventListener("submit", async function(e){

e.preventDefault();

const updatedBook = {
title: document.getElementById("title").value,
author: document.getElementById("author").value,
image: document.getElementById("image").value,
review: document.getElementById("review").value,
status: document.getElementById("status").value
};

await fetch(`${API_URL}/${bookId}`, {
method: "PUT",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify(updatedBook)
});

alert("Book updated successfully");

window.location.href = `book.html?id=${bookId}`;

});

}


// ==============================
// DELETE BOOK
// ==============================

async function deleteBook(id){

    try {

        await fetch(`${API_URL}/${id}?userId=${userId}`, {
            method: "DELETE"
        });

        alert("Book deleted successfully");

        window.location.href = "landing.html";

    } catch(error){
        console.error("Error deleting book:", error);
    }

}


// ==============================
// ADD BOOK FORM
// ==============================

const bookForm = document.getElementById("bookForm");

if (bookForm) {

    bookForm.addEventListener("submit", async function(e){

        e.preventDefault();

        const title = document.getElementById("title").value;
        const author = document.getElementById("author").value;
        const list = document.getElementById("listSelect").value;
        const status = document.getElementById("status").value;
        const image = document.getElementById("image").value;
        const review = document.getElementById("review").value;

        try {

            await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title,
                    author,
                    list,
                    status,
                    image,
                    review,
                    userId
                })
            });

            showToast("New book has been added");

            setTimeout(() => {
                window.location.href = "landing.html";
            }, 1500);

        } catch (error) {

            console.error("Error adding book:", error);

        }

    });

}


// ==============================
// LOAD LISTS INTO DROPDOWN
// ==============================

async function loadListsDropdown(){

    const dropdown = document.getElementById("listSelect");
    if (!dropdown) return;

    try {

        const response = await fetch(`${API_URL}?userId=${userId}`);
        const books = await response.json();

        const lists = new Set();

        books.forEach(book => {
            if(book.list){
                lists.add(book.list);
            }
        });

        lists.forEach(listName => {

            const option = document.createElement("option");

            option.value = listName;
            option.textContent = listName;

            dropdown.appendChild(option);

        });

    } catch(error){

        console.error("Error loading dropdown lists:", error);

    }

}


// ==============================
// TOAST NOTIFICATION
// ==============================

function showToast(message){

    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(()=>{
        toast.classList.remove("show");
    },3000);

}


// ==============================
// PLUS BUTTON MENU
// ==============================

const plusButton = document.querySelector(".plus-btn");
const dropdown = document.querySelector(".dropdown");

if (plusButton && dropdown) {

    plusButton.addEventListener("click", () => {
        dropdown.classList.toggle("show");
    });

}

document.addEventListener("click", function(event){

    if(!event.target.closest(".add-menu")){

        if(dropdown){
            dropdown.classList.remove("show");
        }

    }

});


// ==============================
// INITIAL LOAD
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    loadLists();
    loadListBooks();
    loadListsDropdown();
    loadBookDetails();
    loadEditBook();
    loadUserProfile();

});

function loadUserProfile(){

const username = localStorage.getItem("username");
const email = localStorage.getItem("email");

if(document.getElementById("usernameDisplay")){
document.getElementById("usernameDisplay").textContent = username;
}

if(document.getElementById("emailDisplay")){
document.getElementById("emailDisplay").textContent = email;
}

if(document.getElementById("profileAvatar")){
document.getElementById("profileAvatar").textContent =
username.charAt(0).toUpperCase();
}

}

const username = localStorage.getItem("username");
document.getElementById("profileAvatar").textContent =
username.charAt(0).toUpperCase();

res.json({
message: "Login successful",
userId: user._id,
username: user.username,
email: user.email
});

function logout(){

localStorage.clear();

window.location.href = "index.html";

}