const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store for malls to keep laptop and phone in sync
let globalMalls = {
  mall1: {
    name: "Phoenix Marketcity",
    floors: ["Ground Floor", "Basement 1"],
    slots: [
      { id: "G-1", floor: "Ground Floor", status: "available" },
      { id: "G-2", floor: "Ground Floor", status: "occupied" },
      { id: "G-3", floor: "Ground Floor", status: "available" },
      { id: "G-4", floor: "Ground Floor", status: "occupied" },
      { id: "G-5", floor: "Ground Floor", status: "available" },
      { id: "G-6", floor: "Ground Floor", status: "available" },
      { id: "G-7", floor: "Ground Floor", status: "available" },
      { id: "G-8", floor: "Ground Floor", status: "available" },
      { id: "G-9", floor: "Ground Floor", status: "available" },
      { id: "B1-1", floor: "Basement 1", status: "occupied" },
      { id: "B1-2", floor: "Basement 1", status: "available" }
    ]
  }
};

// --- API ROUTES ---

// GET Mall Data (Used by both Owner Panel and Customer Phone App)
app.get('/api/mall/:id', (req, res) => {
  const mallId = req.params.id;
  if (!globalMalls[mallId]) {
    // Default structure for new malls
    globalMalls[mallId] = {
      name: "Smart Parking Mall",
      floors: ["Ground Floor", "Basement 1"],
      slots: [
        { id: "G-1", floor: "Ground Floor", status: "available" },
        { id: "G-2", floor: "Ground Floor", status: "available" }
      ]
    };
  }
  res.json(globalMalls[mallId]);
});

// POST Update Mall Data (Triggered whenever owner adds/deletes slots or changes status)
app.post('/api/mall/:id', (req, res) => {
  const mallId = req.params.id;
  if (req.body && req.body.slots) {
    globalMalls[mallId] = req.body;
    return res.json({ success: true, message: "Mall configuration updated." });
  }
  res.status(400).json({ error: "Invalid mall payload provided." });
});

// Update single slot status endpoint
app.post('/api/mall/:id/slot/toggle', (req, res) => {
  const mallId = req.params.id;
  const { slotId } = req.body;
  const mall = globalMalls[mallId];

  if (mall) {
    const slot = mall.slots.find(s => s.id === slotId);
    if (slot) {
      slot.status = slot.status === 'available' ? 'occupied' : 'available';
      return res.json({ success: true, slot });
    }
  }
  res.status(404).json({ error: "Slot not found" });
});

// Reserve slot endpoint
app.post('/api/mall/:id/slot/reserve', (req, res) => {
  const mallId = req.params.id;
  const { slotId, vehicleNumber } = req.body;
  const mall = globalMalls[mallId];

  if (mall) {
    const slot = mall.slots.find(s => s.id === slotId);
    if (slot) {
      slot.status = 'reserved';
      slot.vehicleNumber = vehicleNumber || 'NA';
      return res.json({ success: true, slot });
    }
  }
  res.status(404).json({ error: "Slot not found" });
});

// Extend parking endpoint
app.post('/api/mall/:id/slot/extend', (req, res) => {
  const mallId = req.params.id;
  const { slotId, durationHours } = req.body;
  const mall = globalMalls[mallId];

  if (mall) {
    const slot = mall.slots.find(s => s.id === slotId);
    if (slot) {
      slot.extendedHours = (slot.extendedHours || 0) + (parseInt(durationHours) || 1);
      return res.json({ success: true, slot });
    }
  }
  res.status(404).json({ error: "Slot not found" });
});

// --- PAGE ROUTING FALLBACKS ---

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`🚀 Smart Parking Server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`==========================================`);
});