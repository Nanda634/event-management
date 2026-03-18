require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const QRCode = require("qrcode");
const { auth, admin } = require("./middleware/auth");
const pool = require("./db");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* FILE STORAGE */

const storage = multer.diskStorage({
destination: "uploads/",
filename: (req,file,cb)=>{
cb(null, Date.now() + file.originalname);
}
});

const upload = multer({storage});

/* REGISTER */

app.post("/register", async (req,res)=>{

try{

const {name,email,password,role} = req.body;

if(!name || !email || !password){
return res.status(400).send("Missing required fields");
}

/* 🔥 prevent duplicate email */
const check = await pool.query(
"SELECT * FROM users WHERE email=$1",
[email]
);

if(check.rows.length > 0){
return res.status(400).send("Email already exists");
}

const hash = await bcrypt.hash(password,10);

await pool.query(
"INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4)",
[name,email,hash,role || "user"]
);

res.send("User Registered");

}catch(err){

console.error(err);
res.status(500).send("Registration failed");

}

});

/* LOGIN */

app.post("/login", async(req,res)=>{

const {email,password} = req.body;

const result = await pool.query(
"SELECT * FROM users WHERE email=$1",
[email]
);

if(result.rows.length === 0){
return res.status(400).send("User not found");
}

const user = result.rows[0];

const valid = await bcrypt.compare(password,user.password);

if(!valid){
return res.status(400).send("Wrong password");
}

const token = jwt.sign(
{id:user.id, role:user.role},
"secretkey"
);

res.json({token,role:user.role});

});

/* CREATE EVENT */

app.post("/events", auth, admin, upload.single("image"), async (req,res)=>{

try{

const {title,description,event_date,fee} = req.body;

if(!req.file){
return res.status(400).send("Image required");
}

const imagePath = req.file.filename;

await pool.query(
"INSERT INTO events(title,description,event_date,fee,image) VALUES($1,$2,$3,$4,$5)",
[title,description,event_date,fee,imagePath]
);

res.send("Event Created");

}catch(err){

console.error(err);
res.status(500).send("Error creating event");

}

});

/* GET EVENTS */

app.get("/events",async(req,res)=>{

const events = await pool.query("SELECT * FROM events");

res.json(events.rows);

});

/* REGISTER EVENT */

app.post("/register-event", auth, upload.single("payment"), async (req,res)=>{

try{

console.log("BODY:", req.body);
console.log("FILE:", req.file);

const {
event_id,
name,
department,
reg_number,
email,
year,
college
} = req.body;

if(!event_id || !name){
return res.status(400).send("Missing data");
}

if(!req.file){
return res.status(400).send("Payment proof required");
}

await pool.query(
`INSERT INTO registrations
(user_id,event_id,payment_proof,student_name,department,reg_number,email,year,college)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
[
req.user.id,
event_id,
req.file.filename,
name || "N/A",
department || "N/A",
reg_number || "N/A",
email || "N/A",
year || "N/A",
college || "N/A"
]
);

res.send("Registration successful");

}catch(err){

console.error(err);
res.status(500).send("Registration failed");

}

});

/* ADMIN VIEW REGISTRATIONS */

app.get("/registrations",auth,admin,async(req,res)=>{

const data = await pool.query(

`SELECT r.id,u.name,e.title,r.payment_proof,r.status
FROM registrations r
JOIN users u ON r.user_id=u.id
JOIN events e ON r.event_id=e.id
WHERE r.status='pending'`

);

res.json(data.rows);

});

/* APPROVE */

app.put("/approve/:id", auth, admin, async (req,res)=>{

try{

const reg = await pool.query(
`SELECT r.*, u.name, e.title 
FROM registrations r
JOIN users u ON r.user_id=u.id
JOIN events e ON r.event_id=e.id
WHERE r.id=$1`,
[req.params.id]
);

/* 🔥 safety check */
if(reg.rows.length === 0){
return res.status(404).send("Registration not found");
}

const data = reg.rows[0];

const qrData = JSON.stringify({
user: data.name,
event: data.title,
id: data.id
});

const qrImage = await QRCode.toDataURL(qrData);

await pool.query(
"UPDATE registrations SET status='approved', payment_id=$1 WHERE id=$2",
[qrImage, req.params.id]
);

res.send("Approved with QR");

}catch(err){

console.error(err);
res.status(500).send("Error");

}

});

/* REJECT */

app.put("/reject/:id",auth,admin,async(req,res)=>{

await pool.query(
"UPDATE registrations SET status='rejected' WHERE id=$1",
[req.params.id]
);

res.send("Rejected");

});

/* DELETE EVENT */

app.delete("/events/:id", auth, admin, async (req,res)=>{

try{

await pool.query("DELETE FROM events WHERE id=$1",[req.params.id]);

res.send("Event Deleted");

}catch(err){

console.error(err);
res.status(500).send("Delete failed");

}

});

/* VERIFY ATTENDANCE */

app.post("/verify", auth, admin, async (req,res)=>{

try{

const data = JSON.parse(req.body.data);

await pool.query(
"UPDATE registrations SET status='verified' WHERE id=$1",
[data.id]
);

res.send("Attendance marked");

}catch(err){

console.error(err);
res.status(500).send("Verification failed");

}

});

/* USER STATUS */

app.get("/my-registrations", auth, async(req,res)=>{

const data = await pool.query(

`SELECT e.title, r.status, r.payment_id
FROM registrations r
JOIN events e ON r.event_id=e.id
WHERE r.user_id=$1`,

[req.user.id]

);

res.json(data.rows);

});

/* ---------------- USER REGISTRATION STATUS by AI ---------------- */

const axios = require("axios");

app.post("/ai", async (req,res)=>{

try{

const userMessage = req.body.message;

/* 🔥 SIMPLE AI RESPONSE (NO API KEY NEEDED) */

let reply = "I can help you with events, registrations, and dashboard.";

if(userMessage.toLowerCase().includes("event")){
reply = "You can view and register for events in the dashboard.";
}
else if(userMessage.toLowerCase().includes("register")){
reply = "Fill the form and upload payment proof to register.";
}
else if(userMessage.toLowerCase().includes("payment")){
reply = "Upload payment proof while registering.";
}
else if(userMessage.toLowerCase().includes("qr")){
reply = "QR code is generated after admin approval.";
}

res.json({reply});

}catch(err){
console.error(err);
res.json({reply:"AI error"});
}

});
app.get("/test", (req, res) => {
  res.send("Backend working");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});