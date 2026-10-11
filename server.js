import express from "express";
import twilio from "twilio";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const { VoiceResponse } = twilio.twiml;

const SYSTEM =
  "You are Callwise, a phone assistant. Reply in English in at most 3 short sentences. No lists or symbols.";

async function answer(text) {
  const r = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: text || "",
    config: { systemInstruction: SYSTEM },
  });
  return r.text;
}

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

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/chat", async (req, res) => {
  try {
    res.json({ reply: await answer(req.body.text) });
  } catch (e) {
    console.error(e);
    res.json({ reply: "Sorry, something went wrong." });
  }
});

app.post("/voice", (req, res) => {
  const vr = new VoiceResponse();
  listen(vr, "Hi, this is Callwise. Ask me anything.");
  res.type("text/xml").send(vr.toString());
});

app.post("/reply", async (req, res) => {
  const vr = new VoiceResponse();
  try {
    listen(vr, await answer(req.body.SpeechResult));
  } catch (e) {
    console.error(e);
    vr.say("Sorry, something went wrong.");
  }
  res.type("text/xml").send(vr.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Running on " + port));
