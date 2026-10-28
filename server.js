require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const Razorpay = require("razorpay");

const app = express();
const PORT = process.env.PORT || 3000;
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ORDERS_FILE = path.join(__dirname, "orders.json");
const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const adminTokens = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); }
  catch { return []; }
}
function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

const defaultProducts = [
  {id:1,name:"Everyday Black Hoodie",category:"Men",price:999,old:1499,discount:33,rating:4.8,reviews:128,tag:"BESTSELLER",image:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=700&q=85"},
  {id:2,name:"Classic Denim Jacket",category:"Men",price:1799,old:2299,discount:22,rating:4.7,reviews:84,tag:"TRENDING",image:"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=700&q=85"},
  {id:3,name:"Clean White Sneakers",category:"Footwear",price:1499,old:1999,discount:25,rating:4.8,reviews:92,tag:"POPULAR",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"},
  {id:4,name:"Blush Pink Hoodie",category:"Women",price:899,old:1299,discount:31,rating:4.6,reviews:61,tag:"SALE",image:"https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=700&q=85"},
  {id:5,name:"Minimal White Dress",category:"Women",price:1199,old:1599,discount:25,rating:4.7,reviews:55,tag:"NEW",image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85"},
  {id:6,name:"Everyday Running Shoes",category:"Footwear",price:1799,old:2299,discount:22,rating:4.8,reviews:110,tag:"BESTSELLER",image:"https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85"},
  {id:7,name:"Urban Travel Backpack",category:"Accessories",price:1299,old:1699,discount:24,rating:4.6,reviews:47,tag:"ESSENTIAL",image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"},
  {id:8,name:"Relaxed Weekend Shirt",category:"Men",price:799,old:1199,discount:33,rating:4.5,reviews:43,tag:"SALE",image:"https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=85"},
  {id:9,name:"Women's Everyday Trainers",category:"Footwear",price:1399,old:1899,discount:26,rating:4.7,reviews:71,tag:"POPULAR",image:"https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=700&q=85"},
  {id:10,name:"Crossbody Mini Bag",category:"Accessories",price:699,old:999,discount:30,rating:4.5,reviews:39,tag:"SALE",image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85"},
  {id:11,name:"Women's Streetwear Look",category:"Women",price:1599,old:1999,discount:20,rating:4.6,reviews:44,tag:"TRENDING",image:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85"},
  {id:12,name:"Black Casual Sneakers",category:"Footwear",price:1699,old:2199,discount:23,rating:4.7,reviews:68,tag:"POPULAR",image:"https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=85"}
];
function readProducts(){try{return JSON.parse(fs.readFileSync(PRODUCTS_FILE,"utf8"));}catch{fs.writeFileSync(PRODUCTS_FILE,JSON.stringify(defaultProducts,null,2));return defaultProducts;}}
function writeProducts(items){fs.writeFileSync(PRODUCTS_FILE,JSON.stringify(items,null,2));}
let products = readProducts();
function requireAdmin(req,res,next){const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");if(!token||!adminTokens.has(token))return res.status(401).json({error:"Please sign in again."});next();}

function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) throw new Error("Payment gateway is not configured. Add Razorpay keys to .env.");
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

app.get("/api/health", (_req, res) => res.json({ok:true, service:"StyleHub API"}));
app.get("/api/products", (_req,res)=>res.json(readProducts()));
app.post("/api/admin/login", (req,res)=>{if(!ADMIN_PASSWORD)return res.status(503).json({error:"Admin password is not configured on the server."});if(!req.body||req.body.password!==ADMIN_PASSWORD)return res.status(401).json({error:"Incorrect password."});const token=crypto.randomBytes(32).toString("hex");adminTokens.add(token);res.json({token});});
app.get("/api/admin/products",requireAdmin,(_req,res)=>res.json(readProducts()));
app.post("/api/admin/products",requireAdmin,(req,res)=>{const p=req.body||{};if(!p.name||!Number.isFinite(Number(p.price))||Number(p.price)<0)return res.status(400).json({error:"Product name and valid price are required."});const all=readProducts();const item={id:Math.max(0,...all.map(x=>Number(x.id)||0))+1,name:String(p.name).slice(0,120),category:["Men","Women","Footwear","Accessories"].includes(p.category)?p.category:"Men",price:Number(p.price),old:Number(p.old)||Number(p.price),discount:Number(p.discount)||0,rating:5,reviews:0,tag:String(p.tag||"NEW").slice(0,30),image:String(p.image||"").slice(0,1000)};all.push(item);writeProducts(all);products=all;res.status(201).json(item);});
app.put("/api/admin/products/:id",requireAdmin,(req,res)=>{const all=readProducts();const i=all.findIndex(x=>x.id===Number(req.params.id));if(i<0)return res.status(404).json({error:"Product not found."});const p=req.body||{};all[i]={...all[i],name:String(p.name||all[i].name).slice(0,120),category:["Men","Women","Footwear","Accessories"].includes(p.category)?p.category:all[i].category,price:Number.isFinite(Number(p.price))?Number(p.price):all[i].price,old:Number.isFinite(Number(p.old))?Number(p.old):all[i].old,discount:Number.isFinite(Number(p.discount))?Number(p.discount):all[i].discount,tag:String(p.tag||all[i].tag).slice(0,30),image:String(p.image||all[i].image).slice(0,1000)};writeProducts(all);products=all;res.json(all[i]);});
app.delete("/api/admin/products/:id",requireAdmin,(req,res)=>{const all=readProducts();const next=all.filter(x=>x.id!==Number(req.params.id));if(next.length===all.length)return res.status(404).json({error:"Product not found."});writeProducts(next);products=next;res.json({ok:true});});
app.get("/api/admin/orders",requireAdmin,(_req,res)=>res.json(readOrders().slice().reverse()));
app.patch("/api/admin/orders/:id",requireAdmin,(req,res)=>{const allowed=["created","paid","processing","shipped","delivered","cancelled"];if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid order status."});const all=readOrders();const order=all.find(o=>o.orderId===req.params.id);if(!order)return res.status(404).json({error:"Order not found."});order.status=req.body.status;order.updatedAt=new Date().toISOString();writeOrders(all);res.json(order);});
app.get("/api/config", (_req, res) => {
  if (!KEY_ID) return res.status(503).json({error:"Razorpay is not configured"});
  res.json({keyId:KEY_ID});
});

app.post("/api/create-order", async (req, res) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 50)
      return res.status(400).json({error:"Your cart is empty or invalid."});

    let amountRupees = 0;
    const verifiedItems = [];
    for (const item of items) {
      const product = products.find(p => p.id === Number(item.productId));
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20)
        return res.status(400).json({error:"A product or quantity is invalid."});
      amountRupees += product.price * quantity;
      verifiedItems.push({productId:product.id,name:product.name,unitPrice:product.price,quantity});
    }
    // Razorpay expects amount in paise. Never trust a total sent by the browser.
    const amount = amountRupees * 100;
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount, currency:"INR",
      receipt:"sh_"+Date.now().toString(),
      notes:{store:"StyleHub"}
    });
    const orders = readOrders();
    orders.push({
      orderId:order.id, amount, currency:"INR", items:verifiedItems,
      status:"created", createdAt:new Date().toISOString()
    });
    writeOrders(orders);
    res.json({orderId:order.id,amount,currency:"INR",keyId:KEY_ID});
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({error:err.message || "Unable to start checkout."});
  }
});

app.post("/api/verify-payment", (req, res) => {
  try {
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({success:false,error:"Missing payment verification fields."});

    const expected = crypto.createHmac("sha256", KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a,b))
      return res.status(400).json({success:false,error:"Payment signature could not be verified."});

    const orders = readOrders();
    const order = orders.find(o => o.orderId === razorpay_order_id);
    if (!order) return res.status(404).json({success:false,error:"Order not found."});
    if (order.status === "paid") return res.json({success:true,orderId:order.orderId});
    order.status = "paid";
    order.paymentId = razorpay_payment_id;
    order.paidAt = new Date().toISOString();
    writeOrders(orders);
    res.json({success:true,orderId:order.orderId});
  } catch (err) {
    console.error("Payment verification error:", err.message);
    res.status(500).json({success:false,error:"Could not verify payment."});
  }
});

app.listen(PORT, () => console.log(`StyleHub is running at http://localhost:${PORT}`));
