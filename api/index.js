const express = require("express");
const axios = require("axios");
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*', // Production mein ise HubSpot ke domain tak limit kar sakte hain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 🔐 API KEY (use env in prod)
const MEETHOUR_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIyenF5cDM2dWw0dHg5a3Z5cHk0cHp1cnNtMndvenMxeTN6d3oiLCJqdGkiOiJhNDdkYmJhNmFiZDRkMWJhZGQwNTAzMzk2NmNhN2Y4MmMzZmZlYzZiNzJhNmVhNjY4Y2I0YjU5MmYzNWI2ZDU2OGViNWI2MWQ4YjM0NmM0MiIsImlhdCI6MTc2NTg4NjE3Ni4yOTMzMjYsIm5iZiI6MTc2NTg4NjE3Ni4yOTMzMywiZXhwIjoxNzk3NDIyMTc2LjIwNDk3Nywic3ViIjoiNDY2MjQiLCJzY29wZXMiOltdfQ.VeU8wLKbmWfFdRFjGeN0RkN05lXejkHP0JeqcFVixB9jBi7ftsHHVkJ5xqACb3D9fxLVCT65oFk8-Gc_kZmq5g";

app.post(["/schedule-meeting","/api/schedule-meeting"], async (req, res) => {
  console.log("🔔 /schedule-meeting HIT");
  console.log("📦 RAW BODY:", JSON.stringify(req.body, null, 2));

  try {
    const { inputFields } = req.body;

    if (!inputFields) {
    console.error("❌ No inputFields found in body");
    return res.status(400).json({ success: false, error: "Missing inputFields" });
    }

    const meeting_name = (inputFields.meeting_name || "").trim();
    const rawDate = inputFields.meeting_date;
    const rawTime = (inputFields.meeting_time || "").trim();
    const timezone = (inputFields.timezone || "").trim();
    const email = (inputFields.email || "").trim();

    console.log("🔍 Parsed values:", { meeting_name, rawDate, rawTime, timezone, email });

    // ===============================
    // 🔴 VALIDATION
    // ===============================
    if (!meeting_name || !rawDate || !rawTime || !timezone || !email) {
      console.error("❌ Validation failed: Missing required fields");
      return res.status(400).json({
        success: false,
        error: "Missing required HubSpot fields"
      });
    }

    // ===============================
    // 🗓 DATE: ISO string → DD-MM-YYYY
    // ===============================
    const dateObj = new Date(rawDate); // HubSpot sends "YYYY-MM-DD"
    if (isNaN(dateObj.getTime())) {
      console.error("❌ Invalid meeting_date:", rawDate);
      return res.status(400).json({
        success: false,
        error: "Invalid meeting_date format"
      });
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const meeting_date = `${day}-${month}-${year}`;

    console.log("📅 Converted meeting_date:", meeting_date);

    // ===============================
    // ⏰ TIME: hh:mm (12-hr)
    // ===============================
    const [h, m] = rawTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) {
      console.error("❌ Invalid meeting_time:", rawTime);
      return res.status(400).json({
        success: false,
        error: "Invalid meeting_time format"
      });
    }

    const meeting_meridiem = h >= 12 ? "PM" : "AM";
    const meeting_time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    console.log("⏰ Converted time:", { meeting_time, meeting_meridiem });

    // ===============================
    // 🔒 PASSCODE (hardcoded)
    // ===============================
    const passcode = "12333333"; // ✅ always override

    // ===============================
    // 🚀 MEETHOUR PAYLOAD
    // ===============================
    const payload = {
      meeting_name,
      meeting_date,
      meeting_time,
      meeting_meridiem,
      passcode, // ✅ guaranteed value
      email,
      timezone,
      is_show_portal: 1
    };

    console.log("🚀 Final MeetHour Payload:", payload);

    // ===============================
    // 📡 API CALL
    // ===============================
    const response = await axios.post(
      "https://api.meethour.io/api/v1.2/meeting/schedulemeeting",
      payload,
      {
        headers: {
          Authorization: `Bearer ${MEETHOUR_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ MeetHour API Response:", response.data);

    return res.status(200).json({
      success: true,
      message: "Meeting scheduled successfully",
      data: response.data
    });

  } catch (error) {
    console.error("🔥 ERROR scheduling meeting:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.get(['/time','/api/time'], async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const response = await axios.post(
      'https://api.meethour.io/api/v1.2/getTimezone',
      {},
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${MEETHOUR_API_KEY}`
        }
      }
    );
    console.log("✅ Timezones fetched:", response.data.timezones.length);
    res.json({ timezones: response.data.timezones });
  } catch (error) {
    console.error("🔥 ERROR fetching timezones:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch timezones' });
  }
});

// 🟢 SERVER
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Local Server running on port ${PORT}`));
}

module.exports = app;









