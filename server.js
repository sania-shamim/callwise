import express from "express";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.urlencoded({ extended: false }));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const { VoiceResponse } = twilio.twiml;

const SYSTEM =
  "You are Callwise, a phone assistant. Reply in English in at most 3 short sentences. No lists or symbols.";

function listen(vr, text) {
  const g = vr.gather({
    input: "speech",
    action: "/reply",
    speechTimeout: "auto",
    language: "en-IN",
  });
  g.say(text);
  vr.redirect("/voice");
}

app.get("/", (req, res) => res.send("Callwise is running"));

app.post("/voice", (req, res) => {
  const vr = new VoiceResponse();
  listen(vr, "Hi, this is Callwise. Ask me anything.");
  res.type("text/xml").send(vr.toString());
});

app.post("/reply", async (req, res) => {
  const vr = new VoiceResponse();
  try {
    const r = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: req.body.SpeechResult || "",
      config: { systemInstruction: SYSTEM },
    });
    listen(vr, r.text);
  } catch (e) {
    console.error(e);
    vr.say("Sorry, something went wrong.");
  }
  res.type("text/xml").send(vr.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Running on " + port));
