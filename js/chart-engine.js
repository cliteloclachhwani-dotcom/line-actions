function createBrakingChart(canvasId, brakingData, startSpeed) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Smoothing Logic: 20m bachte hi smoothing OFF
    const processedPoints = brakingData.map((p, i, arr) => {
        if (p.x <= 20) return p; 
        if (i === 0 || i === arr.length - 1) return p;
        return { x: p.x, y: (arr[i-1].y + p.y + arr[i+1].y) / 3 };
    });

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Braking Profile',
                data: processedPoints,
                borderColor: 'red',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    reverse: true,
                    min: 0, max: 1100,
                    ticks: { stepSize: 50 }, // 50m Gap
                    grid: { color: '#e0e0e0' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5 }, // 5kmph Gap
                    grid: { color: '#e0e0e0' }
                }
            },
            plugins: {
                legend: { display: false },
                beforeDraw: (chart) => {
                    const { ctx, scales: { y } } = chart;
                    ctx.save();
                    ctx.font = "bold 14px Arial";
                    ctx.fillStyle = "blue";
                    // 1100m ki starting speed display
                    ctx.fillText(`${startSpeed} KMPH`, 10, y.getPixelForValue(startSpeed));
                    ctx.restore();
                }
            }
        }
    });
}
