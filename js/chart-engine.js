function createBrakingChart(canvasId, brakingData, haltLocation, startSpeed) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // 1. Smoothing Logic (2-3 kmph smoothing, but stops at 20m)
    const processedData = brakingData.map((point, index, array) => {
        if (point.x <= 20) return point; // 20m se kam par smoothing OFF
        if (index === 0 || index === array.length - 1) return point;
        
        // Moving Average for Smoothing
        const avgY = (array[index - 1].y + point.y + array[index + 1].y) / 3;
        return { x: point.x, y: avgY };
    });

    // 2. Custom Plugin for Y-axis Speed Display & Watermark
    const customPlugins = {
        id: 'chartCustoms',
        afterDraw: (chart) => {
            const { ctx, chartArea: { left, top }, scales: { x, y } } = chart;
            
            // 1100m par speed value display karna (Bold text on left)
            ctx.save();
            ctx.font = "bold 14px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "right";
            // Point finding for 1100m
            ctx.fillText(`${startSpeed} KMPH`, left - 10, y.getPixelForValue(startSpeed));
            ctx.restore();

            // Light Shade Watermark "MUKESH - SECR"
            ctx.save();
            ctx.font = "15px Arial";
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.textAlign = "center";
            ctx.fillText("MUKESH - SECR", chart.width / 2, chart.height - 10);
            ctx.restore();
        }
    };

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Braking Profile',
                data: processedData,
                borderColor: 'red',
                borderWidth: 2,
                pointRadius: 0, // Profile line ko saaf rakhne ke liye
                fill: false,
                tension: 0.2 // Smoothing factor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 1100,
                    reverse: true, // 1100 se 0 ki taraf
                    grid: { color: '#ddd', lineWidth: 1 },
                    ticks: { stepSize: 50 }, // 50m gap
                    title: { display: true, text: 'Distance from Stop (Meters)', font: { weight: 'bold' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#ddd' },
                    ticks: { stepSize: 5 }, // 5kmph gap
                    title: { display: true, text: 'Speed (KMPH)', font: { weight: 'bold' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        },
        plugins: [customPlugins]
    });
}
