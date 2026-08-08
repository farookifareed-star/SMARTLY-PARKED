// --- DYNAMIC DATA STATE ---
const urlParams = new URLSearchParams(window.location.search);
let currentMallId = urlParams.get('mallId') || 'mall1';

let mallData = {
  name: "Smart Parking Mall",
  floors: ["Ground Floor", "Basement 1"],
  slots: []
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  loadMallData();
  // Sync automatically every 3 seconds so laptop & phone stay synchronized
  setInterval(loadMallData, 3000);
});

async function loadMallData() {
  try {
    const res = await fetch(`/api/mall/${currentMallId}`);
    if (res.ok) {
      mallData = await res.json();
      mallData.baseUrl = window.location.origin;
    } else {
      const saved = localStorage.getItem(`parking_${currentMallId}`);
      if (saved) mallData = JSON.parse(saved);
      if (mallData) mallData.baseUrl = window.location.origin;
    }
  } catch (err) {
    const saved = localStorage.getItem(`parking_${currentMallId}`);
    if (saved) mallData = JSON.parse(saved);
    if (mallData) mallData.baseUrl = window.location.origin;
  }
  renderUI();
}

async function saveMallData() {
  if (typeof mallData !== 'undefined' && mallData) {
    mallData.baseUrl = window.location.origin;  }
  localStorage.setItem(`parking_${currentMallId}`, JSON.stringify(mallData));
  try {
    await fetch(`/api/mall/${currentMallId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mallData)
    });
  } catch (err) {
    console.log('Server sync fallback to local storage');
  }
}

// --- RENDER FUNCTIONS ---
function renderUI() {
  const titleEl = document.getElementById('mallTitle') || document.getElementById('ownerMallTitle');
  if (titleEl && mallData.name) titleEl.innerText = mallData.name;

  const floorSelects = [document.getElementById('floorSelect'), document.getElementById('floorSelectDropdown')];
  floorSelects.forEach(select => {
    if (select) {
      const currentVal = select.value;
      select.innerHTML = '<option value="all">All Locations</option>';
      if (mallData.floors) {
        mallData.floors.forEach(f => {
          select.innerHTML += `<option value="${f}">${f}</option>`;
        });
      }
      if (currentVal) select.value = currentVal;
    }
  });

  const gridContainer = document.getElementById('parkingGrid');
  if (!gridContainer) return;

  const selectedFloor = document.getElementById('floorSelect')?.value || 'all';
  gridContainer.innerHTML = '';

  const slotsToRender = mallData.slots || [];
  const filteredSlots = selectedFloor === 'all' 
    ? slotsToRender 
    : slotsToRender.filter(s => s.floor === selectedFloor);

  if (filteredSlots.length === 0) {
    gridContainer.innerHTML = `<p style="color:#94a3b8; grid-column: 1/-1; text-align:center;">No slots found for this location.</p>`;
    return;
  }

  filteredSlots.forEach(slot => {
    const slotCard = document.createElement('div');
    const isOwner = window.location.pathname.includes('owner.html');

    slotCard.className = `slot-card ${slot.status}`;
    let statusLabel = (slot.status || 'available').toUpperCase();
    let actionButtons = '';

    if (isOwner) {
      actionButtons = `
        <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: center;">
          <button onclick="toggleSlotStatus('${slot.id}')" style="padding:4px 8px; font-size:0.75rem;">Toggle</button>
          <button onclick="deleteSlot('${slot.id}')" style="padding:4px 8px; font-size:0.75rem; background:#ef4444;">Delete</button>
        </div>
      `;
    } else {
      if (slot.status === 'available') {
        actionButtons = `<button onclick="openBookingModal('${slot.id}')" style="margin-top:8px; padding:6px 12px; font-size:0.8rem; background:#10b981;">Reserve</button>`;
      } else {
        actionButtons = `<button onclick="openExtendModal('${slot.id}')" style="margin-top:8px; padding:6px 12px; font-size:0.8rem; background:#f59e0b;">Extend Time</button>`;
      }
    }

    slotCard.innerHTML = `
      <div style="font-weight:bold; font-size:1.1rem;">${slot.id}</div>
      <div style="font-size:0.75rem; opacity:0.9;">${slot.floor}</div>
      <div style="font-size:0.7rem; margin-top:4px; font-weight:600;">${statusLabel}</div>
      ${actionButtons}
    `;

    gridContainer.appendChild(slotCard);
  });
}

// --- OWNER FUNCTIONS ---
function addFloor(floorName) {
  if (!floorName) return;
  if (!mallData.floors.includes(floorName)) {
    mallData.floors.push(floorName);
    saveMallData();
    renderUI();
  }
}

function removeFloor(floorName) {
  if (confirm(`Delete floor "${floorName}"?`)) {
    mallData.floors = mallData.floors.filter(f => f !== floorName);
    mallData.slots = mallData.slots.filter(s => s.floor !== floorName);
    saveMallData();
    renderUI();
  }
}

function addSlot(floor, slotId) {
  if (!floor || !slotId) return alert('Select floor and enter slot ID');
  if (mallData.slots.some(s => s.id === slotId)) return alert('Slot ID already exists!');

  mallData.slots.push({ id: slotId, floor: floor === 'all' ? 'Ground Floor' : floor, status: 'available' });
  saveMallData();
  renderUI();
}

function deleteSlot(slotId) {
  mallData.slots = mallData.slots.filter(s => s.id !== slotId);
  saveMallData();
  renderUI();
}

function toggleSlotStatus(slotId) {
  const slot = mallData.slots.find(s => s.id === slotId);
  if (slot) {
    slot.status = slot.status === 'available' ? 'occupied' : 'available';
    saveMallData();
    renderUI();
  }
}

function updateMallName(newName) {
  if (newName) {
    mallData.name = newName;
    saveMallData();
    renderUI();

    // Re-generate QR poster title dynamically!
    if (typeof generateOwnerQRCode === 'function') {
      generateOwnerQRCode();
    }
  }
}

// --- CUSTOMER RESERVATION & EXTENSION LOGIC ---

let activeSlotId = null;
let activeActionType = 'reserve'; // 'reserve' or 'extend'

function openBookingModal(slotId) {
  activeSlotId = slotId;
  activeActionType = 'reserve';
  
  const title = document.getElementById('modalSlotTitle');
  const input = document.getElementById('vehicleInput');
  const modal = document.getElementById('bookingModal');

  if (title) title.innerText = `Reserve Slot ${slotId}`;
  if (input) {
    input.value = '';
    input.placeholder = "Vehicle Reg Number (e.g. KA-01-1234)";
    input.type = "text";
  }
  if (modal) modal.classList.remove('hidden');
}

function openExtendModal(slotId) {
  activeSlotId = slotId;
  activeActionType = 'extend';

  const title = document.getElementById('modalSlotTitle');
  const input = document.getElementById('vehicleInput');
  const modal = document.getElementById('bookingModal');

  if (title) title.innerText = `Extend Time for Slot ${slotId}`;
  if (input) {
    input.value = '1';
    input.placeholder = "Hours to extend (e.g. 1, 2)";
    input.type = "number";
  }
  if (modal) modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.classList.add('hidden');
  activeSlotId = null;
}

async function confirmAction() {
  const inputVal = document.getElementById('vehicleInput')?.value.trim();

  if (!inputVal) {
    alert(activeActionType === 'reserve' ? 'Please enter a vehicle registration number' : 'Please enter extension hours');
    return;
  }

  if (activeActionType === 'reserve') {
    const slot = mallData.slots.find(s => s.id === activeSlotId);
    if (slot) {
      slot.status = 'reserved';
      slot.vehicleNumber = inputVal;
    }

    try {
      await fetch(`/api/mall/${currentMallId}/slot/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: activeSlotId, vehicleNumber: inputVal })
      });
    } catch (err) {
      console.error('Reservation API Error:', err);
    }

    alert(`Slot ${activeSlotId} successfully reserved!`);
  } else {
    const slot = mallData.slots.find(s => s.id === activeSlotId);
    if (slot) {
      slot.extendedHours = (slot.extendedHours || 0) + parseInt(inputVal);
    }

    try {
      await fetch(`/api/mall/${currentMallId}/slot/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: activeSlotId, durationHours: inputVal })
      });
    } catch (err) {
      console.error('Extend API Error:', err);
    }

    alert(`Parking extended for ${inputVal} hour(s)!`);
  }

  saveMallData();
  renderUI();
  closeModal();
}