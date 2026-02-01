let masters = [];
let chartInstance = null;

// Load all CSVs (Stations and Signals)
async function initMasters() {
    const files = ['station.csv', 'up_signals.csv', 'dn_signals.csv', 'up_mid_signals.csv', 'dn_mid_signals.csv'];
    for (let f of files) {
        Papa.parse(`master_data/${f}`, {
            download: true, header: true,
            complete: (res) => { masters.push(...res.data); }
        });
    }
}

function ddmToDec(v) {
    if (!v) return 0;
    let f = parseFloat(v);
    let deg = Math.floor(f / 100);
    return deg + (f - deg * 100) / 60;
}

// Map coordinates to nearest Signal/LC/NS
function findNearestMarker(lat, lng) {
    let nearest = { name: "Route", dist: Infinity };
    masters.forEach(m => {
        let mLat = ddmToDec(m.Lat || m['Start_Lat ']);
        let mLng = ddmToDec(m.Lng || m.Start_Lng);
        let d = Math.hypot(lat - mLat, lng - mLng);
        if (d < nearest.dist) nearest = { name: m.SIGNAL_NAME || m.Station_Name, dist: d };
    });
    return nearest.name;
}

function startAnalysis() {
    const file = document.getElementById('rtisInput').files[0];
    if (!file) return alert("Select File");

    Papa.parse(file, {
        header: true, dynamicTyping: true,
        complete: (results) => {
            const data = results.data;
            let haltPoints = [];
            
            // 1. Halt Detection (<1 kmph)
            data.forEach((row, i) => {
                if (row.Speed < 1) {
                    let markerName = findNearestMarker(row.Latitude, row.Longitude);
                    // Extract 1100m data
                    let brakingProfile = [];
                    let d = 0;
                    for (let j = i; j >= 0 && d <= 1100; j--) {
                        if (j < i) d += Math.abs(data[j].distFromPrevLatLng || 0.5);
                        
                        // Smoothing: 2-3kmph fluctuation remove karein, 20m par raw rakhein
                        let spd = data[j].Speed;
                        if (d > 20 && j > 0 && j < data.length - 1) {
                            spd = (data[j-1].Speed + data[j].Speed + data[j+1].Speed) / 3;
                        }

                        brakingProfile.push({
                            x: Math.round(d), 
                            y: parseFloat(spd.toFixed(2)),
                            time: data[j]['Logging Time'],
                            marker: findNearestMarker(data[j].Latitude, data[j].Longitude)
                        });
                    }
                    
                    haltPoints.push({
                        label: `Stop @ ${markerName} (${data[i]['Logging Time']})`,
                        data: brakingProfile,
                        startSpeed2000: data[Math.max(0, i-200)]?.Speed || 0 // Speed at roughly 2000m ago
                    });
                    
                    // Skip analysis for this halt duration to find next one
                    i += 60; 
                }
            });

            document.getElementById('haltCountDisplay').innerText = `Halts Found: ${haltPoints.length}`;
            drawChart(haltPoints);
        }
    });
}

function drawChart(halts) {
    const ctx = document.getElementById('mainBrakingChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#d35400', '#27ae60'];

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: halts.map((h, i) => ({
                label: h.label,
                data: h.data,
                borderColor: colors[i % colors.length],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4, // Smoothing
                segment: {
                    // Disable smoothing at 20m
                    borderDash: ctx => ctx.p1.raw.x < 20 ? [] : [] 
                }
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            scales: {
                x: {
                    type: 'linear', reverse: true, min: 0, max: 1100,
                    ticks: { stepSize: 50 },
                    title: { display: true, text: 'Distance from Stop (Meters)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5 },
                    title: { display: true, text: 'Speed (KMPH)' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let p = context.raw;
                            return `Spd: ${p.y} | Dist: ${p.x}m | Time: ${p.time} | Signal/LC: ${p.marker}`;
                        }
                    }
                }
            }
        }
    });
}

initMasters();
