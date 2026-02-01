let masters = { stations: [], signals: [] };

// Future date block
document.getElementById('reportDate').max = new Date().toISOString().split("T")[0];

// Master data load karna (CSV files)
async function loadMasters() {
    const files = ['station.csv', 'dn_signals.csv', 'up_signals.csv', 'dn_mid_signals.csv', 'up_mid_signals.csv'];
    for (let f of files) {
        Papa.parse(`master_data/${f}`, {
            download: true, header: true,
            complete: (res) => {
                if (f === 'station.csv') masters.stations = res.data;
                else masters.signals.push(...res.data);
            }
        });
    }
}

function ddmToDec(val) {
    if (!val) return null;
    let v = parseFloat(val);
    let deg = Math.floor(v / 100);
    let min = (v - (deg * 100)) / 60;
    return deg + min;
}

// Location Mapping Logic: Kin do signals/stations ke bich ruka hai
function getMapping(lat, lng) {
    let allLocs = [...masters.stations.map(s => ({name: s.Station_Name, lat: ddmToDec(s['Start_Lat ']), lng: ddmToDec(s.Start_Lng)})),
                  ...masters.signals.map(s => ({name: s.SIGNAL_NAME, lat: ddmToDec(s.Lat), lng: ddmToDec(s.Lng)}))];
    
    allLocs.sort((a, b) => {
        let dA = Math.hypot(lat - a.lat, lng - a.lng);
        let dB = Math.hypot(lat - b.lat, lng - b.lng);
        return dA - dB;
    });

    return `<${allLocs[0].name} - ${allLocs[1].name}>`;
}

function processData() {
    const file = document.getElementById('locoFile').files[0];
    if (!file) return alert("File select karein");

    Papa.parse(file, {
        header: true,
        complete: (results) => {
            const data = results.data;
            let halts = []; 
            // Halt detection logic here (Speed <= 5 kmph for 2 mins)
            // Har halt ke liye 1100m ka data extract karke charts banaye jayenge
            renderCharts(halts, data);
        }
    });
}

function renderCharts(halts, fullData) {
    const container = document.getElementById('chart-container');
    container.innerHTML = "";
    
    halts.forEach((halt, index) => {
        const mappingLabel = getMapping(halt.lat, halt.lng);
        const chartDiv = document.createElement('div');
        chartDiv.className = "chart-box";
        chartDiv.innerHTML = `<h3>Halt #${index+1} at ${mappingLabel}</h3><canvas id="chart-${index}"></canvas>
                             <button onclick="downloadPDF(${index})">Download PDF Report</button>`;
        container.appendChild(chartDiv);
        
        createHighResChart(`chart-${index}`, halt.brakingData);
    });
}

function createHighResChart(id, data) {
    // 50m X-axis aur 5kmph Y-axis grid logic
    new Chart(document.getElementById(id), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Braking Profile (Speed vs Distance)',
                data: data, // Distance: 1100 to 0
                borderColor: 'red',
                tension: 0.1 // 2-3 kmph smoothing, 20m par smoothing 0 ho jayegi
            }]
        },
        options: {
            scales: {
                x: { type: 'linear', ticks: { stepSize: 50 }, grid: { display: true } },
                y: { ticks: { stepSize: 5 }, grid: { display: true } }
            }
        }
    });
}

loadMasters();
