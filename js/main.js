let masters = [];

// 1. Master Files Load
async function loadMasters() {
    const files = ['station.csv', 'up_signals.csv', 'dn_signals.csv', 'up_mid_signals.csv', 'dn_mid_signals.csv'];
    for (let f of files) {
        Papa.parse(`master_data/${f}`, {
            download: true, header: true,
            complete: (res) => { masters.push(...res.data); }
        });
    }
}

// Coordinate Conversion DDMM.mmmm -> Decimal
function conv(v) {
    if (!v) return 0;
    let f = parseFloat(v);
    let deg = Math.floor(f / 100);
    return deg + (f - deg * 100) / 60;
}

// 2. Mapping between two locations
function getMapLabel(lat, lng) {
    let sorted = masters.map(m => ({
        name: m.SIGNAL_NAME || m.Station_Name,
        lat: conv(m.Lat || m['Start_Lat ']),
        lng: conv(m.Lng || m.Start_Lng)
    })).sort((a, b) => Math.hypot(lat - a.lat, lng - a.lng) - Math.hypot(lat - b.lat, lng - b.lng));

    return `<${sorted[0].name} - ${sorted[1].name}>`;
}

// 3. Halt Detection (01 kmph / 10 sec)
function processData() {
    const file = document.getElementById('locoFile').files[0];
    if (!file) return alert("File choose karein!");

    Papa.parse(file, {
        header: true, dynamicTyping: true,
        complete: (results) => {
            let data = results.data;
            let halts = [];
            let stopInfo = null;

            data.forEach((row, i) => {
                if (row.Speed < 1) { // 01 KMPH Limit
                    if (!stopInfo) stopInfo = { startIdx: i, time: row['Logging Time'], lat: row.Latitude, lng: row.Longitude };
                } else {
                    if (stopInfo) {
                        let duration = (new Date(row['Logging Time']) - new Date(stopInfo.time)) / 1000;
                        if (duration >= 10) { // 10 Sec Limit
                            halts.push({
                                label: getMapLabel(stopInfo.lat, stopInfo.lng),
                                time: stopInfo.time,
                                dur: duration.toFixed(0),
                                braking: extract1100m(data, stopInfo.startIdx)
                            });
                        }
                        stopInfo = null;
                    }
                }
            });
            renderReports(halts);
        }
    });
}

function extract1100m(data, idx) {
    let segment = [];
    let dist = 0;
    for (let i = idx; i >= 0 && dist <= 1100; i--) {
        if (i < idx) dist += Math.abs(data[i].distFromPrevLatLng || 0.5);
        segment.push({ x: dist, y: data[i].Speed });
    }
    return segment;
}

function renderReports(halts) {
    const container = document.getElementById('report-display');
    container.innerHTML = "";
    const manual = {
        loco: document.getElementById('locoNo').value,
        train: document.getElementById('trainNo').value,
        lp: document.getElementById('lpId').value,
        date: document.getElementById('reportDate').value
    };

    halts.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = "report-card";
        div.id = `report-${i}`;
        div.innerHTML = `
            <div style="text-align:center; border-bottom: 2px solid #000;">
                <h2>BRAKING ANALYSIS REPORT</h2>
                <p>Date: ${manual.date} | Loco: ${manual.loco} | Train: ${manual.train} | LP ID: ${manual.lp}</p>
            </div>
            <h3>STOP LOCATION: ${h.label}</h3>
            <p>Halt Time: ${h.time} | Duration: ${h.dur} sec</p>
            <div class="chart-container"><canvas id="c-${i}"></canvas></div>
            <div class="btn-group">
                <button class="btn-html" onclick="saveHTML(${i})">Download HTML</button>
                <button class="btn-pdf" onclick="savePDF(${i})">Save as PDF</button>
            </div>
        `;
        container.appendChild(div);
        createBrakingChart(`c-${i}`, h.braking, h.braking[h.braking.length-1].y.toFixed(1));
    });
}

// PDF & HTML Saving logic
function saveHTML(id) {
    const content = document.getElementById(`report-${id}`).innerHTML;
    const blob = new Blob([`<html><body style="font-family:sans-serif">${content}</body></html>`], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Report_Stop_${id+1}.html`;
    a.click();
}

async function savePDF(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const element = document.getElementById(`report-${id}`);
    const canvas = await html2canvas(element);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 280, 180);
    doc.save(`Report_Stop_${id+1}.pdf`);
}

loadMasters();
