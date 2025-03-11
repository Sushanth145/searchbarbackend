require("dotenv").config();
const express = require("express");
const redis = require("redis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const client = redis.createClient({
    url: "rediss://default:c75207c8f0684fc58ebf8eeb310ea66d@gusc1-sharp-osprey-31084.upstash.io:31084",
    socket: {
        tls: true // Enable TLS for secure Upstash connection
    }
});

client.on("error", (err) => console.error("❌ Redis Error:", err));
client.on("connect", () => console.log("✅ Connected to Upstash Redis"));

client.connect();

app.post("/search", async (req, res) => {
    const { term } = req.body;
    if (!term) return res.status(400).json({ error: "Search term required" });

    await client.zIncrBy("search_terms", 1, term); // Increment search popularity
    res.json({ message: "Search term added successfully" });
});

app.get("/autocomplete", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);

    try {
        const suggestions = await client.zRangeByScore("search_terms", "-inf", "+inf", { LIMIT: { offset: 0, count: 5 } });
        const filteredSuggestions = suggestions.filter(term => term.startsWith(query));
        res.json(filteredSuggestions);
    } catch (err) {
        res.status(500).json({ error: "Redis error" });
    }
});

app.delete("/clear", async (req, res) => {
    await client.del("search_terms");
    res.json({ message: "Search history cleared" });
});

// 🔹 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
