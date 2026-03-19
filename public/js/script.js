const API = "http://localhost:3000";

let selectedEventId = null;

/* ---------------- REGISTER USER ---------------- */

async function register(e) {
  e.preventDefault(); // 🔥 VERY IMPORTANT

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.text();
    alert(data);

  } catch (err) {
    console.error("Fetch error:", err);
  }
}
/* ---------------- LOGIN ---------------- */

async function login(){

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

const res = await fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({email,password})
});

const data = await res.json();

console.log("LOGIN:", data); // ✅ DEBUG

localStorage.setItem("token",data.token);

if(data.role === "admin"){
window.location.href = "admin_dashboard.html";
}else if(data.role === "user"){
window.location.href = "user_dashboard.html";
}else{
alert("Unknown role");
}

}

/* ---------------- CREATE EVENT ---------------- */

async function createEvent(){

const title = document.getElementById("title").value;
const description = document.getElementById("desc").value;
const event_date = document.getElementById("date").value;
const fee = document.getElementById("fee").value;

const fileInput = document.getElementById("image");

if(!fileInput.files.length){
alert("Upload event image");
return;
}

const formData = new FormData();

formData.append("title", title);
formData.append("description", description);
formData.append("event_date", event_date);
formData.append("fee", fee);
formData.append("image", fileInput.files[0]);

try{

const res = await fetch(API + "/events", {
method: "POST",
headers:{ Authorization: localStorage.getItem("token") },
body: formData
});

const text = await res.text();

alert(text);

loadEvents();

}catch(err){
console.error(err);
alert("Event creation failed");
}

}

/* ---------------- LOAD EVENTS (ADMIN) ---------------- */

async function loadEvents(){

const res = await fetch(API+"/events");
const events = await res.json();

const container = document.getElementById("eventsList");
if(!container) return;

container.innerHTML="";

events.forEach(e=>{

container.innerHTML += `

<div class="event-card">

${e.image ? `<img src="${API}/uploads/${e.image}" class="event-img">` : ""}

<h3>${e.title}</h3>
<p>${e.description}</p>
<p>💰 ₹${e.fee}</p>
<p>📅 ${e.event_date}</p>

<button onclick="deleteEvent(${e.id})">Delete</button>

</div>

`;

});

}

/* ---------------- DELETE EVENT ---------------- */

async function deleteEvent(id){

if(!confirm("Are you sure you want to delete this event?")) return;

await fetch(API + "/events/" + id, {
method: "DELETE",
headers:{ Authorization: localStorage.getItem("token") }
});

alert("Event Deleted");

loadEvents();

}

/* ---------------- NAVIGATION ---------------- */

function showSection(section){

const sections = ["createSection","eventsSection","registrationsSection","scannerSection"];

sections.forEach(id=>{
const el = document.getElementById(id);
if(el) el.style.display="none";
});

if(section==="create"){
document.getElementById("createSection").style.display="block";
}

if(section==="events"){
document.getElementById("eventsSection").style.display="block";
loadEvents();
}

if(section==="registrations"){
document.getElementById("registrationsSection").style.display="block";
loadRegistrations();
}

if(section==="scanner"){
document.getElementById("scannerSection").style.display="block";
}

}

/* ---------------- USER EVENTS ---------------- */

async function loadUserEvents(){

const res = await fetch(API+"/events");
const events = await res.json();

const container = document.getElementById("events");
if(!container) return;

container.innerHTML="";

events.forEach(e=>{

container.innerHTML += `

<div class="event-card">

${e.image ? `<img src="${API}/uploads/${e.image}" class="event-img">` : ""}

<h3>${e.title}</h3>
<p>${e.description}</p>
<p>💰 ₹${e.fee}</p>

<button onclick="openRegisterModal(${e.id})">Register</button>

</div>

`;

});

}

/* ---------------- MODAL ---------------- */

function openRegisterModal(eventId){
selectedEventId = eventId;
document.getElementById("registerModal").style.display="flex";
}

function closeModal(){
document.getElementById("registerModal").style.display="none";
}

/* ---------------- SUBMIT REGISTRATION ---------------- */

async function submitRegistration(){

if(!selectedEventId){
alert("Event not selected");
return;
}

const name = document.getElementById("studentName")?.value || "";
const department = document.getElementById("department")?.value || "";
const regNumber = document.getElementById("regNumber")?.value || "";
const email = document.getElementById("studentEmail")?.value || "";
const year = document.getElementById("year")?.value || "";
const college = document.getElementById("college")?.value || "";

const fileInput = document.getElementById("paymentProof");

if(!name || !email){
alert("Name and Email required");
return;
}

if(!fileInput.files.length){
alert("Upload payment proof");
return;
}

const token = localStorage.getItem("token");

const formData = new FormData();

formData.append("event_id", selectedEventId);
formData.append("name", name);
formData.append("department", department || "N/A");   // ✅ FIX
formData.append("reg_number", regNumber || "N/A");    // ✅ FIX
formData.append("email", email);
formData.append("year", year || "N/A");               // ✅ FIX
formData.append("college", college || "N/A");         // ✅ FIX
formData.append("payment", fileInput.files[0]);

try{

const res = await fetch(API + "/register-event", {
method: "POST",
headers:{ Authorization: token },
body: formData
});

const text = await res.text();

console.log("SERVER RESPONSE:", text); // 🔥 DEBUG

alert(text);

if(res.ok){
closeModal();
loadMyRegistrations();
}

}catch(err){
console.error(err);
alert("Registration failed");
}

}
/* ---------------- ADMIN REGISTRATIONS ---------------- */

async function loadRegistrations(){

const res = await fetch(API + "/registrations", {
headers:{ Authorization: localStorage.getItem("token") }
});

const data = await res.json();

const container = document.getElementById("registrations");
if(!container) return;

container.innerHTML="";

data.forEach(r=>{
container.innerHTML += `
<div class="event-card">
<h3>${r.title}</h3>
<p>${r.name}</p>
<a href="${API}/uploads/${r.payment_proof}" target="_blank">View</a>
<button onclick="approve(${r.id})">Approve</button>
<button onclick="reject(${r.id})">Reject</button>
</div>`;
});

}

/* ---------------- APPROVE / REJECT ---------------- */

async function approve(id){
await fetch(API+"/approve/"+id,{
method:"PUT",
headers:{Authorization:localStorage.getItem("token")}
});
loadRegistrations();
}

async function reject(id){
await fetch(API+"/reject/"+id,{
method:"PUT",
headers:{Authorization:localStorage.getItem("token")}
});
loadRegistrations();
}

/* ---------------- USER STATUS ---------------- */

async function loadMyRegistrations(){

const res = await fetch(API+"/my-registrations",{
headers:{Authorization:localStorage.getItem("token")}
});

const data = await res.json();

const container = document.getElementById("myEvents");
if(!container) return;

container.innerHTML="";

data.forEach(e=>{
container.innerHTML += `
<div class="event-card">
<h3>${e.title}</h3>
<p>${e.status}</p>
${e.payment_id ? `<img src="${e.payment_id}" width="150">` : ""}
</div>`;
});

}

/* ---------------- QR SCANNER ---------------- */

function startScanner(){

if(typeof Html5Qrcode === "undefined"){
alert("Scanner library not loaded");
return;
}

const scanner = new Html5Qrcode("reader");

scanner.start(
{ facingMode: "environment" },
{ fps:10, qrbox:250 },
(decodedText)=>{

document.getElementById("scanResult").innerText = decodedText;

fetch(API + "/verify",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:localStorage.getItem("token")
},
body:JSON.stringify({data:decodedText})
});

}
);

}
/* ---------------- SEND AI MESSAGE ---------------- */
async function sendAI(){

const input = document.getElementById("aiInput");
const message = input.value.trim();
const lower = message.toLowerCase();

if(!message) return;

const chatBox = document.getElementById("chatBox");

/* show user message */
chatBox.innerHTML += `<p><b>You:</b> ${message}</p>`;

let reply = "";

/* ---------- SMART COMMANDS ---------- */

if(lower.includes("show events")){
loadUserEvents();
reply = "Here are the available events.";
}

else if(lower.includes("registrations")){
loadRegistrations();
reply = "Showing all registrations.";
}

else if(lower.includes("status")){
loadMyRegistrations();
reply = "Here is your registration status.";
}

else if(lower.includes("create event")){
showSection("create");
reply = "Opening event creation panel.";
}

else if(lower.includes("scan")){
showSection("scanner");
reply = "Opening QR scanner.";
}

/* ---------- FALLBACK AI (IMPORTANT) ---------- */
else{

try{

const res = await fetch("/ai",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify({message})
});

const data = await res.json();

reply = data.reply || "AI did not respond.";

}catch(err){

console.error(err);
reply = "AI server error.";

}

}

/* show AI reply */
chatBox.innerHTML += `<p><b>AI:</b> ${reply}</p>`;

/* clear input */
input.value = "";

/* auto scroll */
chatBox.scrollTop = chatBox.scrollHeight;
}
/* ---------------- AI VOICE INPUT ---------------- */
function startVoice(){

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

recognition.start();

recognition.onresult = function(event){

const text = event.results[0][0].transcript;

document.getElementById("aiInput").value = text;

sendAI();

};

}

/* ---------------- PAGE LOAD ---------------- */

document.addEventListener("DOMContentLoaded", () => {

const createBtn = document.getElementById("createBtn");
const submitBtn = document.getElementById("submitBtn");

if(createBtn) createBtn.addEventListener("click", createEvent);
if(submitBtn) submitBtn.addEventListener("click", submitRegistration);

if(document.getElementById("eventsList")) loadEvents();
if(document.getElementById("events")) loadUserEvents();
if(document.getElementById("registrations")) loadRegistrations();
if(document.getElementById("myEvents")) loadMyRegistrations();

});