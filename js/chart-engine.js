// Chart Configuration for 50m Grid and 5kmph Speed steps
const chartOptions = {
    scales: {
        x: {
            grid: { color: '#ddd', lineWidth: 1 },
            ticks: { stepSize: 50 }, // 50-50 meter ka gap
            title: { display: true, text: 'Distance (Meters)' }
        },
        y: {
            grid: { color: '#ddd' },
            ticks: { stepSize: 5 }, // 05-05 kmph ka gap
            title: { display: true, text: 'Speed (KMPH)' }
        }
    },
    plugins: {
        watermark: {
            text: "MUKESH - SECR", // Light shade watermark logic
            color: "rgba(0,0,0,0.05)",
            size: "15px"
        }
    }
};
